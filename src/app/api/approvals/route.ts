import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser, notifyRole } from '@/lib/sms';
import { logAuditEvent, extractIpAddress } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';
import { TARequestStatus, Role, ApprovalAction } from '@prisma/client';

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
    let usePrisma = true;

    // 1. Fetch the target request with approval steps
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

    if (action === 'APPROVED') {
      let nextStatus = request.status;
      let notificationMsg = '';

      if (currentStepOrder === 1) {
        nextStatus = 'PENDING_DIVISION_CHIEF';
        notificationMsg = `Your TA Request (${request.trackingNumber}) was approved by Section Chief and is now pending Division Chief review.`;
      } else if (currentStepOrder === 2) {
        nextStatus = 'PENDING_HEAD_PENRO';
        notificationMsg = `Your TA Request (${request.trackingNumber}) was approved by Division Chief and is now pending Head of PENRO final approval.`;
      } else if (currentStepOrder === 3) {
        nextStatus = 'APPROVED';
        notificationMsg = `Congratulations! Your TA Request (${request.trackingNumber}) has been fully approved by Head of PENRO. Printable document ready.`;
      }

      let updateSucceeded = false;

      if (usePrisma) {
        try {
          await prisma.approvalStep.update({
            where: { id: currentStep.id },
            data: {
              action: ApprovalAction.APPROVED,
              approverId: userId,
              remarks: remarks ? remarks.trim() : null,
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
        const { error: sbStepErr } = await supabase
          .from('ApprovalStep')
          .update({
            action: 'APPROVED',
            approverId: userId,
            remarks: remarks ? remarks.trim() : null,
            actionDate: new Date().toISOString(),
          })
          .eq('id', currentStep.id);

        if (sbStepErr) {
          console.error('[Approvals API] Supabase Step update error:', sbStepErr);
        }

        const { error: sbReqErr } = await supabase
          .from('TARequest')
          .update({ status: nextStatus, updatedAt: new Date().toISOString() })
          .eq('id', requestId);

        if (sbReqErr) {
          console.error('[Approvals API] Supabase TARequest update error:', sbReqErr);
        }
      }

      const employeeName = request.createdBy?.name || 'an employee';
      const taDetails = {
        trackingNumber: request.trackingNumber,
        destination: request.destination,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        startDate: request.startDate,
        endDate: request.endDate,
        status: nextStatus,
        approverName: (session.user as any)?.name || 'Approving Official',
        approverRole: userRole,
        remarks: remarks?.trim() || undefined,
      };

      // 1. Notify creator employee
      await notifyUser({
        userId: request.createdById,
        requestId: request.id,
        title: currentStepOrder === 3 ? 'TA Request Fully Approved' : 'TA Request Step Approved',
        message: notificationMsg,
        channel: 'BOTH',
        taDetails,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
      });

      // 2. Notify next approver role — include employee name so verifiers know whose request it is
      if (currentStepOrder === 1) {
        await notifyRole({
          role: Role.DIVISION_CHIEF,
          requestId: request.id,
          title: 'TA Request Reviewed by Section Chief',
          message: `${employeeName}'s TA Request (${request.trackingNumber}) has been reviewed and endorsed by the Section Chief. It is now awaiting your Division Chief review.`,
          channel: 'BOTH',
          taDetails: { ...taDetails, status: 'PENDING_DIVISION_CHIEF' },
          actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
        });
      } else if (currentStepOrder === 2) {
        await notifyRole({
          role: Role.HEAD_PENRO,
          requestId: request.id,
          title: 'TA Request Reviewed by Division Chief',
          message: `${employeeName}'s TA Request (${request.trackingNumber}) has been reviewed and endorsed by the Division Chief. It is now awaiting your final approval as Head of PENRO.`,
          channel: 'BOTH',
          taDetails: { ...taDetails, status: 'PENDING_HEAD_PENRO' },
          actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
        });
      }

      // Audit Log: Record approval event
      const approverName = (session.user as any)?.name || 'Approving Official';
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
          remarks: remarks?.trim() || null,
        },
      });

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
        await supabase
          .from('ApprovalStep')
          .update({
            action: 'REJECTED',
            approverId: userId,
            remarks: remarks.trim(),
            actionDate: new Date().toISOString(),
          })
          .eq('id', currentStep.id);

        await supabase
          .from('TARequest')
          .update({ status: 'REJECTED_MANUAL' })
          .eq('id', requestId);
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

      // Notify employee
      await notifyUser({
        userId: request.createdById,
        requestId: request.id,
        title: 'TA Request Returned for Revision',
        message: `Your TA Request (${request.trackingNumber}) was returned by ${userRole}. Reason: "${remarks.trim()}". You may edit the travel dates and resubmit.`,
        channel: 'BOTH',
        taDetails: rejectTaDetails,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
      });

      // Audit Log: Record rejection event
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
