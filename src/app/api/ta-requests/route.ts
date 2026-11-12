import { NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { notifyUser, notifyRole } from '@/lib/sms';
import { logAuditEvent, extractIpAddress } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';
import { TARequestStatus, Role, ApprovalAction } from '@prisma/client';
import { getDivisionForSection } from '@/lib/constants/organization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : (null as any);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as Role;
    const userSection = (session.user as any).section as string | undefined;
    const userDivision = (session.user as any).division as string | undefined || getDivisionForSection(userSection);

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');
    const dateFromParam = url.searchParams.get('dateFrom') || url.searchParams.get('startDate');
    const dateToParam = url.searchParams.get('dateTo') || url.searchParams.get('endDate');

    let requests: any[] = [];

    try {
      let whereClause: any = {};

      if (statusParam) {
        whereClause.status = statusParam as TARequestStatus;
      }

      if (dateFromParam) {
        const startDay = new Date(`${dateFromParam}T00:00:00Z`);
        whereClause.startDate = { ...whereClause.startDate, gte: startDay };
      }
      if (dateToParam) {
        const endDay = new Date(`${dateToParam}T23:59:59.999Z`);
        whereClause.startDate = { ...whereClause.startDate, lte: endDay };
      }

      if (userRole === Role.EMPLOYEE || userRole === Role.ACCOUNT_MANAGER) {
        whereClause.OR = [
          { createdById: userId },
          { teamMembers: { some: { userId: userId } } },
        ];
      }
      // Verifiers (SECTION_CHIEF, DIVISION_CHIEF, HEAD_PENRO, ADMIN) can view all agency requests for pipeline monitoring & history

      requests = await prisma.tARequest.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, section: true, division: true, position: true, signatureUrl: true },
          },
          teamMembers: true,
          approvalSteps: {
            orderBy: { order: 'asc' },
            include: {
              approver: {
                select: { id: true, name: true, email: true, position: true, role: true, signatureUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.warn('[GET TA Requests] Prisma query error, using Supabase REST API fallback...', err);
      let query = supabase
        .from('TARequest')
        .select('*, createdBy:User!createdById(id, name, email, section, division, position, signatureUrl), teamMembers:TARequestMember(*), approvalSteps:ApprovalStep(*, approver:User!approverId(id, name, email, position, role, signatureUrl))');
      
      if (statusParam) {
        query = query.eq('status', statusParam);
      }
      if (dateFromParam) {
        query = query.gte('startDate', `${dateFromParam}T00:00:00`);
      }
      if (dateToParam) {
        query = query.lte('startDate', `${dateToParam}T23:59:59.999`);
      }
      if (userRole === Role.EMPLOYEE || userRole === Role.ACCOUNT_MANAGER) {
        query = query.or(`createdById.eq.${userId}`);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });
      if (data && !error) {
        requests = data;
      }
    }

    // Query active verifiers to dynamically attach designated signatories to steps
    let verifiers: any[] = [];
    if (!isDummyDbUrl) {
      try {
        verifiers = await prisma.user.findMany({
          where: {
            role: { in: ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'] },
            status: 'ACTIVE',
          },
          select: { id: true, name: true, email: true, role: true, section: true, division: true, position: true },
        });
      } catch (err) {}
    }
    if ((!verifiers || verifiers.length === 0) && supabaseUrl && supabaseKey) {
      const { data: vData } = await supabase
        .from('User')
        .select('id, name, email, role, section, division, position')
        .in('role', ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'])
        .eq('status', 'ACTIVE');
      if (vData) verifiers = vData;
    }

    // Post-process requests: Sort approval steps, attach designated verifiers, and synchronize status
    const processedRequests = (requests || []).map((req) => {
      let rawSteps = Array.isArray(req.approvalSteps) ? [...req.approvalSteps] : [];
      rawSteps.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      const reqSection = req.createdBy?.section;
      const reqDivision = req.createdBy?.division || getDivisionForSection(reqSection);

      // Match designated Section Chief, Division Chief, and Head of PENRO based on creator's unit
      const designatedSectionChief =
        verifiers.find(
          (v) =>
            v.role === 'SECTION_CHIEF' &&
            v.section &&
            reqSection &&
            v.section.trim().toLowerCase() === reqSection.trim().toLowerCase()
        ) ||
        verifiers.find(
          (v) =>
            v.role === 'SECTION_CHIEF' &&
            v.division &&
            reqDivision &&
            v.division.trim().toLowerCase() === reqDivision.trim().toLowerCase()
        ) ||
        verifiers.find((v) => v.role === 'SECTION_CHIEF');

      const designatedDivChief =
        verifiers.find(
          (v) =>
            v.role === 'DIVISION_CHIEF' &&
            v.division &&
            reqDivision &&
            v.division.trim().toLowerCase() === reqDivision.trim().toLowerCase()
        ) || verifiers.find((v) => v.role === 'DIVISION_CHIEF');

      const designatedHeadPenro = verifiers.find((v) => v.role === 'HEAD_PENRO');

      const steps = rawSteps.map((s: any) => {
        let approverObj = s.approver;
        const designated =
          s.order === 1 ? designatedSectionChief : s.order === 2 ? designatedDivChief : designatedHeadPenro;

        if (!approverObj || !approverObj.name) {
          if (designated) {
            approverObj = {
              id: designated.id,
              name: designated.name,
              role: designated.role,
              position: designated.position,
              email: designated.email,
            };
          }
        }

        return {
          ...s,
          approver: approverObj,
          designatedApprover: designated
            ? {
                id: designated.id,
                name: designated.name,
                role: designated.role,
                position: designated.position,
              }
            : null,
        };
      });

      let synchronizedStatus = req.status;
      if (req.status !== 'REJECTED_MANUAL' && req.status !== 'REJECTED_OVERDUE' && req.status !== 'DRAFT' && steps.length > 0) {
        const step1 = steps.find((s: any) => s.order === 1);
        const step2 = steps.find((s: any) => s.order === 2);
        const step3 = steps.find((s: any) => s.order === 3);

        if (step1?.action === 'APPROVED' && step2?.action === 'APPROVED' && step3?.action === 'APPROVED') {
          synchronizedStatus = 'APPROVED';
        } else if (step1?.action === 'APPROVED' && step2?.action === 'APPROVED') {
          synchronizedStatus = 'PENDING_HEAD_PENRO';
        } else if (step1?.action === 'APPROVED') {
          synchronizedStatus = 'PENDING_DIVISION_CHIEF';
        } else {
          synchronizedStatus = 'PENDING_SECTION_CHIEF';
        }
      }

      return {
        ...req,
        status: synchronizedStatus,
        approvalSteps: steps,
      };
    });

    // Role-based scoping: Strictly filter requests returned to verifiers
    const scopedRequests = processedRequests.filter((req) => {
      // 1. Employees and Account Managers only see their own requests or where they are team members
      if (userRole === Role.EMPLOYEE || userRole === Role.ACCOUNT_MANAGER) {
        const isOwner = req.createdById === userId;
        const isTeamMember = Array.isArray(req.teamMembers) && req.teamMembers.some((m: any) => m.userId === userId);
        return isOwner || isTeamMember;
      }

      // 2. Administrators can view all agency requests
      if (userRole === Role.ADMIN) {
        return true;
      }

      // Hide DRAFT requests of other users from all verifiers
      if (req.status === 'DRAFT' && req.createdById !== userId) {
        return false;
      }

      const reqSection = req.createdBy?.section;
      const reqDivision = req.createdBy?.division || getDivisionForSection(reqSection);

      // 3. Section Chief scoping:
      // Must belong to this chief's section (or division if general/unspecified section)
      if (userRole === 'SECTION_CHIEF') {
        if (userSection && reqSection) {
          if (reqSection.trim().toLowerCase() !== userSection.trim().toLowerCase()) {
            return false;
          }
        } else if (userDivision && reqDivision) {
          if (reqDivision.trim().toLowerCase() !== userDivision.trim().toLowerCase()) {
            return false;
          }
        }
        return true;
      }

      // 4. Division Chief scoping:
      // Must match this chief's division
      if (userRole === 'DIVISION_CHIEF') {
        const effectiveUserDiv = (userDivision || getDivisionForSection(userSection) || '').trim().toLowerCase();
        const effectiveReqDiv = (reqDivision || '').trim().toLowerCase();

        if (effectiveUserDiv && effectiveReqDiv && effectiveReqDiv !== effectiveUserDiv) {
          return false;
        }

        // Must have reached Division Chief or later!
        // If still sitting at PENDING_SECTION_CHIEF and Step 1 not approved, do not show!
        const step1 = req.approvalSteps?.find((s: any) => s.order === 1);
        const step2 = req.approvalSteps?.find((s: any) => s.order === 2);
        const isStep1Approved = step1?.action === 'APPROVED';
        const isStep2Actioned = step2 && step2.action !== 'PENDING';

        const reachedDivChief = isStep1Approved || isStep2Actioned || [
          'PENDING_DIVISION_CHIEF',
          'PENDING_HEAD_PENRO',
          'APPROVED',
          'REJECTED_MANUAL',
          'REJECTED_OVERDUE',
        ].includes(req.status);

        if (req.status === 'PENDING_SECTION_CHIEF' && !isStep1Approved) {
          return false;
        }

        return reachedDivChief;
      }

      // 5. Head of PENRO scoping:
      // Must have reached Head of PENRO step or later!
      if (userRole === 'HEAD_PENRO') {
        const step2 = req.approvalSteps?.find((s: any) => s.order === 2);
        const step3 = req.approvalSteps?.find((s: any) => s.order === 3);
        const isStep2Approved = step2?.action === 'APPROVED';
        const isStep3Actioned = step3 && step3.action !== 'PENDING';

        const reachedPenro = isStep2Approved || isStep3Actioned || [
          'PENDING_HEAD_PENRO',
          'APPROVED',
        ].includes(req.status);

        // Do not show requests still at Section Chief or Division Chief review
        if ((req.status === 'PENDING_SECTION_CHIEF' || req.status === 'PENDING_DIVISION_CHIEF') && !isStep2Approved) {
          return false;
        }

        // If request was returned at earlier steps, Head of PENRO does not need to see it
        if (req.status === 'REJECTED_MANUAL' && !isStep2Approved) {
          return false;
        }

        return reachedPenro;
      }

      return true;
    });

    return NextResponse.json({ success: true, data: scopedRequests });
  } catch (error: any) {
    console.error('[GET TA Requests Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'An Employee';
    const body = await req.json();
    const {
      purpose,
      destination,
      destinationLat,
      destinationLng,
      startDate,
      endDate,
      teamMembers = [],
      attachments = [],
      submitImmediately = true,
    } = body;

    if (!purpose || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Purpose, destination, start date, and end date are required.' },
        { status: 400 }
      );
    }

    const userRole = (session.user as any).role as Role;
    const userSection = (session.user as any).section as string | undefined;
    const userDivision = (session.user as any).division as string | undefined;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timeSuffix = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const trackingNumber = `TA-${dateStr}-${timeSuffix}${randomSuffix}`;

    // Determine initial approval step based on submitter's role:
    // If a Section Chief files a TO, Step 1 is auto-endorsed and it starts at Step 2 (Division Chief)
    // If a Division Chief files a TO, Steps 1 & 2 are auto-endorsed and it starts at Step 3 (Head of PENRO)
    let step1Action: ApprovalAction = ApprovalAction.PENDING;
    let step1ApproverId: string | null = null;
    let step1Remarks: string | null = null;
    let step1Date: Date | null = null;

    let step2Action: ApprovalAction = ApprovalAction.PENDING;
    let step2ApproverId: string | null = null;
    let step2Remarks: string | null = null;
    let step2Date: Date | null = null;

    let initialStatus: TARequestStatus = TARequestStatus.DRAFT;

    if (userRole === Role.DIVISION_CHIEF) {
      step1Action = ApprovalAction.APPROVED;
      step1ApproverId = userId;
      step1Remarks = 'N/A - Direct Division Chief request';
      step1Date = new Date();

      step2Action = ApprovalAction.APPROVED;
      step2ApproverId = userId;
      step2Remarks = 'Self-requested by Division Chief';
      step2Date = new Date();

      initialStatus = submitImmediately ? TARequestStatus.PENDING_HEAD_PENRO : TARequestStatus.DRAFT;
    } else if (userRole === Role.SECTION_CHIEF) {
      step1Action = ApprovalAction.APPROVED;
      step1ApproverId = userId;
      step1Remarks = 'Self-requested by Section Chief';
      step1Date = new Date();

      initialStatus = submitImmediately ? TARequestStatus.PENDING_DIVISION_CHIEF : TARequestStatus.DRAFT;
    } else {
      initialStatus = submitImmediately ? TARequestStatus.PENDING_SECTION_CHIEF : TARequestStatus.DRAFT;
    }

    let request: any = null;

    try {
      request = await prisma.tARequest.create({
        data: {
          trackingNumber,
          createdById: userId,
          purpose: purpose.trim(),
          destination: destination.trim(),
          destinationLat: destinationLat ? parseFloat(destinationLat) : null,
          destinationLng: destinationLng ? parseFloat(destinationLng) : null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: initialStatus,
          attachments: (Array.isArray(attachments) ? attachments : []) as any,
          teamMembers: {
            create: teamMembers.map((member: { name: string; position?: string; userId?: string }) => ({
              name: member.name.trim(),
              position: member.position ? member.position.trim() : null,
              userId: member.userId || null,
            })),
          },
          approvalSteps: {
            create: [
              { order: 1, approverRole: Role.SECTION_CHIEF, action: step1Action, approverId: step1ApproverId, remarks: step1Remarks, actionDate: step1Date },
              { order: 2, approverRole: Role.DIVISION_CHIEF, action: step2Action, approverId: step2ApproverId, remarks: step2Remarks, actionDate: step2Date },
              { order: 3, approverRole: Role.HEAD_PENRO, action: ApprovalAction.PENDING },
            ],
          },
        },
        include: {
          teamMembers: true,
          approvalSteps: true,
        },
      });
    } catch (err) {
      console.warn('[POST TA Request] Prisma error, using Supabase REST API fallback...', err);
      
      const reqId = 'ta_req_' + Math.random().toString(36).substring(2, 11);
      
      const { data: newReq, error: reqErr } = await supabase
        .from('TARequest')
        .insert({
          id: reqId,
          trackingNumber,
          createdById: userId,
          purpose: purpose.trim(),
          destination: destination.trim(),
          destinationLat: destinationLat ? parseFloat(destinationLat) : null,
          destinationLng: destinationLng ? parseFloat(destinationLng) : null,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status: initialStatus,
          attachments: Array.isArray(attachments) ? attachments : [],
        })
        .select()
        .single();

      if (newReq && !reqErr) {
        request = newReq;

        // Insert approval steps
        await supabase.from('ApprovalStep').insert([
          { id: 'app_step_' + Math.random().toString(36).substring(2, 11), requestId: reqId, order: 1, approverRole: 'SECTION_CHIEF', action: step1Action, approverId: step1ApproverId, remarks: step1Remarks, actionDate: step1Date ? step1Date.toISOString() : null },
          { id: 'app_step_' + Math.random().toString(36).substring(2, 11), requestId: reqId, order: 2, approverRole: 'DIVISION_CHIEF', action: step2Action, approverId: step2ApproverId, remarks: step2Remarks, actionDate: step2Date ? step2Date.toISOString() : null },
          { id: 'app_step_' + Math.random().toString(36).substring(2, 11), requestId: reqId, order: 3, approverRole: 'HEAD_PENRO', action: 'PENDING' },
        ]);

        if (teamMembers.length > 0) {
          await supabase.from('TARequestMember').insert(
            teamMembers.map((m: any) => ({
              id: 'member_' + Math.random().toString(36).substring(2, 11),
              requestId: reqId,
              name: m.name.trim(),
              position: m.position ? m.position.trim() : null,
              userId: m.userId || null,
            }))
          );
        }
      }
    }

    if (submitImmediately && request) {
      const currentPendingStatus = initialStatus as string;
      const taDetails = {
        trackingNumber: request.trackingNumber,
        destination: request.destination,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        startDate: request.startDate,
        endDate: request.endDate,
        status: currentPendingStatus,
      };

      // Notify creator (Employee / Signatory)
      let submitMsg = `Your Travel Order request (${request.trackingNumber}) to ${destination} has been submitted for Section Chief approval.`;
      if (initialStatus === TARequestStatus.PENDING_DIVISION_CHIEF) {
        submitMsg = `Your Travel Order request (${request.trackingNumber}) to ${destination} has been submitted for Division Chief approval.`;
      } else if (initialStatus === TARequestStatus.PENDING_HEAD_PENRO) {
        submitMsg = `Your Travel Order request (${request.trackingNumber}) to ${destination} has been submitted for Head of PENRO approval.`;
      }

      // ── FAST IN-APP NOTIFICATIONS (Synchronous, ~20ms) ──────────────────────
      // Immediately write In-App Notification records to Supabase so that
      // Supabase Realtime emits WebSocket push events to the Section Chief with ZERO delay!
      let approverTitle = 'New TO Request for Review';
      let approverMsg = `New Travel Order request (${request.trackingNumber}) by ${userName} (${userSection || 'Section'}) to ${destination} is awaiting Section Chief verification.`;
      if (initialStatus === TARequestStatus.PENDING_DIVISION_CHIEF) {
        approverTitle = 'New TO Request for Review';
        approverMsg = `New Travel Order request (${request.trackingNumber}) by ${userName} (${userDivision || 'Division'}) to ${destination} is awaiting Division Chief verification.`;
      } else if (initialStatus === TARequestStatus.PENDING_HEAD_PENRO) {
        approverTitle = 'New TO Request for Approval';
        approverMsg = `New Travel Order request (${request.trackingNumber}) by ${userName} to ${destination} is awaiting Head of PENRO approval.`;
      }

      const inAppTasks = [
        notifyUser({
          userId,
          requestId: request.id,
          title: 'TO Request Submitted',
          message: submitMsg,
          channel: 'IN_APP',
          taDetails,
          actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
        }),
      ];

      if (initialStatus === TARequestStatus.PENDING_SECTION_CHIEF) {
        inAppTasks.push(
          notifyRole({
            role: Role.SECTION_CHIEF,
            section: userSection,
            requestId: request.id,
            title: approverTitle,
            message: approverMsg,
            channel: 'IN_APP',
            taDetails,
            actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
          })
        );
      } else if (initialStatus === TARequestStatus.PENDING_DIVISION_CHIEF) {
        inAppTasks.push(
          notifyRole({
            role: Role.DIVISION_CHIEF,
            division: userDivision,
            requestId: request.id,
            title: approverTitle,
            message: approverMsg,
            channel: 'IN_APP',
            taDetails,
            actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
          })
        );
      } else if (initialStatus === TARequestStatus.PENDING_HEAD_PENRO) {
        inAppTasks.push(
          notifyRole({
            role: Role.HEAD_PENRO,
            requestId: request.id,
            title: approverTitle,
            message: approverMsg,
            channel: 'IN_APP',
            taDetails,
            actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
          })
        );
      }

      try {
        await Promise.all(inAppTasks);
      } catch (inAppErr) {
        console.error('[ta-requests] In-app notification error:', inAppErr);
      }

      // ── SCHEDULE EXTERNAL SMS, EMAIL & AUDIT LOG VIA AFTER() ──────────────────
      after(async () => {
        try {
          const externalTasks: Promise<any>[] = [
            notifyUser({
              userId,
              recipientEmail: (session.user as any)?.email,
              recipientPhone: (session.user as any)?.phoneNumber,
              recipientName: userName,
              requestId: request.id,
              title: 'TO Request Submitted',
              message: submitMsg,
              channel: 'BOTH',
              taDetails,
              actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
              skipDbInsert: true,
            })
          ];

          if (initialStatus === TARequestStatus.PENDING_SECTION_CHIEF) {
            externalTasks.push(
              notifyRole({
                role: Role.SECTION_CHIEF,
                section: userSection,
                requestId: request.id,
                title: approverTitle,
                message: approverMsg,
                channel: 'BOTH',
                taDetails,
                actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
                skipDbInsert: true,
              })
            );
          } else if (initialStatus === TARequestStatus.PENDING_DIVISION_CHIEF) {
            externalTasks.push(
              notifyRole({
                role: Role.DIVISION_CHIEF,
                division: userDivision,
                requestId: request.id,
                title: approverTitle,
                message: approverMsg,
                channel: 'BOTH',
                taDetails,
                actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
                skipDbInsert: true,
              })
            );
          } else if (initialStatus === TARequestStatus.PENDING_HEAD_PENRO) {
            externalTasks.push(
              notifyRole({
                role: Role.HEAD_PENRO,
                requestId: request.id,
                title: approverTitle,
                message: approverMsg,
                channel: 'BOTH',
                taDetails,
                actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
                skipDbInsert: true,
              })
            );
          }

          externalTasks.push(
            logAuditEvent({
              actorId: userId,
              actorName: userName,
              actorRole: (session.user as any).role || 'EMPLOYEE',
              ipAddress: extractIpAddress(req),
              action: submitImmediately ? 'SUBMITTED' : 'DRAFT_CREATED',
              target: 'TARequest',
              targetId: request.id,
              trackingNumber: request.trackingNumber,
              requestId: request.id,
              details: submitImmediately
                ? `Submitted TO request to ${destination} for Section Chief approval.`
                : `Created TO request draft to ${destination}.`,
              metadata: {
                destination: destination.trim(),
                startDate,
                endDate,
                teamMembersCount: teamMembers.length,
              },
            })
          );

          await Promise.allSettled(externalTasks);
        } catch (bgErr) {
          console.error('[ta-requests after()] Background error:', bgErr);
        }
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'TO Request created successfully.',
        data: request,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[POST TA Request Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
