import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { notifyUser, notifyRole } from '@/lib/sms';
import { logAuditEvent, extractIpAddress } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';
import { TARequestStatus, Role, ApprovalAction } from '@prisma/client';
import { getDivisionForSection } from '@/lib/constants/organization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as Role;

    const body = await req.json();
    const { requestId, action, remarks } = body;

    if (!requestId || !action || (action !== 'APPROVED' && action !== 'REJECTED')) {
      return NextResponse.json(
        { success: false, error: 'Valid requestId and action (APPROVED or REJECTED) are required.' },
        { status: 400 }
      );
    }

    let request: any = null;
    let usePrisma = !isDummyDbUrl;

    // 1. Fetch the target request with approval steps
    if (usePrisma) {
      try {
        request = await prisma.tARequest.findUnique({
          where: { id: requestId },
          include: {
            approvalSteps: { orderBy: { order: 'asc' } },
            createdBy: true,
          },
        });
      } catch (prismaErr) {
        console.warn('[Approvals API] Prisma query error, falling back to Supabase REST API...', prismaErr);
        usePrisma = false;
      }
    }

    if (!request) {
      try {
        const { data: reqData, error: reqErr } = await supabase
          .from('TARequest')
          .select('*, approvalSteps:ApprovalStep(*), createdBy:User!createdById(*)')
          .eq('id', requestId)
          .single();

        if (reqErr || !reqData) {
          return NextResponse.json({ success: false, error: 'TA Request not found.' }, { status: 404 });
        }

        if (Array.isArray(reqData.approvalSteps)) {
          reqData.approvalSteps.sort((a: any, b: any) => a.order - b.order);
        }
        request = reqData;
        usePrisma = false;
      } catch (sbFetchErr) {
        console.error('[Approvals API] Supabase fetch error:', sbFetchErr);
        return NextResponse.json({ success: false, error: 'TA Request not found or database unreachable.' }, { status: 404 });
      }
    }

    if (!request) {
      return NextResponse.json({ success: false, error: 'TA Request not found.' }, { status: 404 });
    }

    // Check terminal or invalid states
    if (request.status === 'APPROVED') {
      return NextResponse.json({ success: false, error: 'This request is already fully approved.' }, { status: 400 });
    }

    if (request.status === 'REJECTED_OVERDUE') {
      return NextResponse.json({ success: false, error: 'This request was automatically rejected due to overdue date and is terminal.' }, { status: 400 });
    }

    // Determine current pending step from status or approvalSteps
    let currentStepOrder = 1;
    if (request.status === 'PENDING_SECTION_CHIEF') currentStepOrder = 1;
    else if (request.status === 'PENDING_DIVISION_CHIEF') currentStepOrder = 2;
    else if (request.status === 'PENDING_HEAD_PENRO') currentStepOrder = 3;
    else {
      const pendingStep = (request.approvalSteps || []).find((s: any) => s.action === 'PENDING');
      if (pendingStep) {
        currentStepOrder = pendingStep.order;
      } else {
        return NextResponse.json({ success: false, error: 'Request is not in a pending review status.' }, { status: 400 });
      }
    }

    const currentStep = request.approvalSteps?.find((s: any) => s.order === currentStepOrder);
    if (!currentStep) {
      return NextResponse.json({ success: false, error: 'Approval step configuration error.' }, { status: 500 });
    }

    // Strictly enforce role check matching the step requirement
    const requiredRoleForStep: Record<number, string> = {
      1: 'SECTION_CHIEF',
      2: 'DIVISION_CHIEF',
      3: 'HEAD_PENRO',
    };

    if (userRole !== requiredRoleForStep[currentStepOrder] && userRole !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: `Unauthorized step action. Step ${currentStepOrder} requires ${requiredRoleForStep[currentStepOrder]} role.`,
        },
        { status: 403 }
      );
    }

    // Strictly enforce section and division matching
    const userSection = (session.user as any).section as string | undefined;
    const userDivision = (session.user as any).division as string | undefined || getDivisionForSection(userSection);
    const reqSection = request.createdBy?.section as string | undefined;
    const reqDivision = request.createdBy?.division as string | undefined || getDivisionForSection(reqSection);

    if (userRole === 'SECTION_CHIEF' && currentStepOrder === 1) {
      if (reqSection && userSection && reqSection.trim().toLowerCase() !== userSection.trim().toLowerCase()) {
        return NextResponse.json(
          {
            success: false,
            error: `Unauthorized. You are assigned to "${userSection}", but this request is from "${reqSection}".`,
          },
          { status: 403 }
        );
      }
    }

    if (userRole === 'DIVISION_CHIEF' && currentStepOrder === 2) {
      if (reqDivision && userDivision && reqDivision.trim().toLowerCase() !== userDivision.trim().toLowerCase()) {
        return NextResponse.json(
          {
            success: false,
            error: `Unauthorized. You are assigned to "${userDivision}", but this request is from "${reqDivision}".`,
          },
          { status: 403 }
        );
      }
    }

    if (action === 'APPROVED') {
      let nextStatus = request.status;
      let notificationMsg = '';
      const cleanRemarks = remarks ? remarks.trim() : '';
      const remarksSuffix = cleanRemarks ? ` Remarks: "${cleanRemarks}"` : '';

      if (currentStepOrder === 1) {
        nextStatus = 'PENDING_DIVISION_CHIEF';
        notificationMsg = `Your TO Request (${request.trackingNumber}) was approved by Section Chief and is now pending Division Chief review.${remarksSuffix}`;
      } else if (currentStepOrder === 2) {
        nextStatus = 'PENDING_HEAD_PENRO';
        notificationMsg = `Your TO Request (${request.trackingNumber}) was approved by Division Chief and is now pending Head of PENRO final approval.${remarksSuffix}`;
      } else if (currentStepOrder === 3) {
        nextStatus = 'APPROVED';
        notificationMsg = `Congratulations! Your TO Request (${request.trackingNumber}) has been fully approved by Head of PENRO. Printable document ready.${remarksSuffix}`;
      }

      let updateSucceeded = false;

      if (usePrisma) {
        try {
          await prisma.approvalStep.update({
            where: { id: currentStep.id },
            data: {
              action: ApprovalAction.APPROVED,
              approverId: userId,
              remarks: cleanRemarks || null,
              actionDate: new Date(),
            },
          });

          await prisma.tARequest.update({
            where: { id: requestId },
            data: { status: nextStatus as TARequestStatus, updatedAt: new Date() },
          });

          updateSucceeded = true;
        } catch (updateErr) {
          console.warn('[Approvals API] Prisma update error, falling back to Supabase REST API...', updateErr);
        }
      }

      if (!updateSucceeded) {
        const [sbStepRes, sbReqRes] = await Promise.all([
          supabase
            .from('ApprovalStep')
            .update({
              action: 'APPROVED',
              approverId: userId,
              remarks: cleanRemarks || null,
              actionDate: new Date().toISOString(),
            })
            .eq('id', currentStep.id),
          supabase
            .from('TARequest')
            .update({ status: nextStatus, updatedAt: new Date().toISOString() })
            .eq('id', requestId),
        ]);

        if (sbStepRes.error) {
          console.error('[Approvals API] Supabase Step update error:', sbStepRes.error);
        }
        if (sbReqRes.error) {
          console.error('[Approvals API] Supabase TARequest update error:', sbReqRes.error);
        }
      }

      const employeeName = request.createdBy?.name || 'an employee';
      const approverName = (session.user as any)?.name || 'Approving Official';
      const taDetails = {
        trackingNumber: request.trackingNumber,
        destination: request.destination,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        startDate: request.startDate,
        endDate: request.endDate,
        status: nextStatus,
        approverName,
        approverRole: userRole,
        remarks: cleanRemarks || undefined,
      };

      // ── NON-BLOCKING BACKGROUND DISPATCH ──────────────────────────────────────
      // SMS dispatch, external geocoding, and Gmail SMTP TLS handshakes take seconds.
      // We run them in the background so the user returns to their dashboard in milliseconds!
      void (async () => {
        try {
          // 1. Notify creator employee
          await notifyUser({
            userId: request.createdById,
            requestId: request.id,
            title: currentStepOrder === 3 ? 'TO Request Fully Approved' : 'TO Request Step Approved',
            message: notificationMsg,
            channel: 'BOTH',
            taDetails,
            actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
          });
        } catch (notifErr) {
          console.error('[Approvals API Background] notifyUser error:', notifErr);
        }

        try {
          // 2. Notify next approver role — targeted to specific division chief
          if (currentStepOrder === 1) {
            let divChiefMsg = `${employeeName}'s TO Request (${request.trackingNumber}) has been reviewed and endorsed by the Section Chief. It is now awaiting your Division Chief review.`;
            if (cleanRemarks) {
              divChiefMsg += ` Section Chief Remarks: "${cleanRemarks}"`;
            }
            await notifyRole({
              role: Role.DIVISION_CHIEF,
              division: reqDivision,
              requestId: request.id,
              title: 'TO Request Reviewed by Section Chief',
              message: divChiefMsg,
              channel: 'BOTH',
              taDetails: { ...taDetails, status: 'PENDING_DIVISION_CHIEF' },
              actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
            });
          } else if (currentStepOrder === 2) {
            let penroMsg = `${employeeName}'s TO Request (${request.trackingNumber}) has been reviewed and endorsed by the Division Chief. It is now awaiting your final approval as Head of PENRO.`;
            if (cleanRemarks) {
              penroMsg += ` Division Chief Remarks: "${cleanRemarks}"`;
            }
            await notifyRole({
              role: Role.HEAD_PENRO,
              requestId: request.id,
              title: 'TO Request Reviewed by Division Chief',
              message: penroMsg,
              channel: 'BOTH',
              taDetails: { ...taDetails, status: 'PENDING_HEAD_PENRO' },
              actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
            });
          }
        } catch (roleNotifErr) {
          console.error('[Approvals API Background] notifyRole error:', roleNotifErr);
        }

        try {
          // 3. Audit Log: Record approval event
          const roleLabels: Record<number, string> = { 1: 'Section Chief', 2: 'Division Chief', 3: 'Head of PENRO' };
          await logAuditEvent({
            actorId: userId,
            actorName: approverName,
            actorRole: userRole,
            ipAddress: extractIpAddress(req),
            action: 'APPROVED',
            target: 'TARequest',
            targetId: requestId,
            trackingNumber: request.trackingNumber,
            requestId: requestId,
            details: `Step ${currentStepOrder} (${roleLabels[currentStepOrder]}) approved. Status → ${nextStatus}.`,
            metadata: {
              stepOrder: currentStepOrder,
              stepRole: requiredRoleForStep[currentStepOrder],
              previousStatus: request.status,
              newStatus: nextStatus,
              remarks: cleanRemarks || null,
            },
          });
        } catch (auditErr) {
          console.error('[Approvals API Background] logAuditEvent error:', auditErr);
        }
      })();

      return NextResponse.json({
        success: true,
        message: `Step ${currentStepOrder} approved successfully. Request status updated to ${nextStatus}.`,
      });
    } else {
      // REJECTED
      if (!remarks || !remarks.trim()) {
        return NextResponse.json({ success: false, error: 'A rejection reason/remarks is required when rejecting a request.' }, { status: 400 });
      }

      if (usePrisma) {
        try {
          await prisma.approvalStep.update({
            where: { id: currentStep.id },
            data: {
              action: ApprovalAction.REJECTED,
              approverId: userId,
              remarks: remarks.trim(),
              actionDate: new Date(),
            },
          });

          await prisma.tARequest.update({
            where: { id: requestId },
            data: { status: TARequestStatus.REJECTED_MANUAL },
          });
        } catch (updateErr) {
          console.warn('[Approvals API] Prisma update error, falling back to Supabase REST API...', updateErr);
          usePrisma = false;
        }
      }

      if (!usePrisma) {
        const [sbStepRes, sbReqRes] = await Promise.all([
          supabase
            .from('ApprovalStep')
            .update({
              action: 'REJECTED',
              approverId: userId,
              remarks: remarks.trim(),
              actionDate: new Date().toISOString(),
            })
            .eq('id', currentStep.id),
          supabase
            .from('TARequest')
            .update({ status: 'REJECTED_MANUAL' })
            .eq('id', requestId),
        ]);

        if (sbStepRes.error) {
          console.error('[Approvals API] Supabase Step reject error:', sbStepRes.error);
        }
        if (sbReqRes.error) {
          console.error('[Approvals API] Supabase TARequest reject error:', sbReqRes.error);
        }
      }

      const rejectTaDetails = {
        trackingNumber: request.trackingNumber,
        destination: request.destination,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        startDate: request.startDate,
        endDate: request.endDate,
        status: 'REJECTED_MANUAL',
        approverName: (session.user as any)?.name || 'Approving Official',
        approverRole: userRole,
        remarks: remarks.trim(),
      };

      // ── NON-BLOCKING BACKGROUND DISPATCH FOR REJECTION ────────────────────────
      void (async () => {
        try {
          await notifyUser({
            userId: request.createdById,
            requestId: request.id,
            title: 'TO Request Returned for Revision',
            message: `Your TO Request (${request.trackingNumber}) was returned by ${userRole}. Reason: "${remarks.trim()}". You may edit the travel dates and resubmit.`,
            channel: 'BOTH',
            taDetails: rejectTaDetails,
            actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
          });
        } catch (notifErr) {
          console.error('[Approvals API Background] reject notifyUser error:', notifErr);
        }

        try {
          const rejecterName = (session.user as any)?.name || 'Approving Official';
          const roleLabelsReject: Record<number, string> = { 1: 'Section Chief', 2: 'Division Chief', 3: 'Head of PENRO' };
          await logAuditEvent({
            actorId: userId,
            actorName: rejecterName,
            actorRole: userRole,
            ipAddress: extractIpAddress(req),
            action: 'REJECTED',
            target: 'TARequest',
            targetId: requestId,
            trackingNumber: request.trackingNumber,
            requestId: requestId,
            details: `Rejected at step ${currentStepOrder} (${roleLabelsReject[currentStepOrder]}). Reason: "${remarks.trim()}"`,
            metadata: {
              stepOrder: currentStepOrder,
              stepRole: requiredRoleForStep[currentStepOrder],
              previousStatus: request.status,
              newStatus: 'REJECTED_MANUAL',
              remarks: remarks.trim(),
            },
          });
        } catch (auditErr) {
          console.error('[Approvals API Background] reject logAuditEvent error:', auditErr);
        }
      })();

      return NextResponse.json({
        success: true,
        message: `Request rejected. Employee notified to edit dates if desired.`,
      });
    }
  } catch (error: any) {
    console.error('[POST Approvals API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
