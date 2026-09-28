import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser, notifyRole } from '@/lib/sms';
import { logAuditEvent, extractIpAddress } from '@/lib/auditLog';
import { createClient } from '@supabase/supabase-js';
import { TARequestStatus, Role, ApprovalAction } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role as Role;

    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');

    let requests: any[] = [];

    try {
      let whereClause: any = {};

      if (statusParam) {
        whereClause.status = statusParam as TARequestStatus;
      }

      if (userRole === Role.EMPLOYEE) {
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
            select: { id: true, name: true, email: true, section: true, position: true },
          },
          teamMembers: true,
          approvalSteps: {
            orderBy: { order: 'asc' },
            include: {
              approver: {
                select: { id: true, name: true, email: true, position: true, role: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.warn('[GET TA Requests] Prisma query error, using Supabase REST API fallback...', err);
      let query = supabase.from('TARequest').select('*, createdBy:User!createdById(id, name, email, section, position), teamMembers:TARequestMember(*), approvalSteps:ApprovalStep(*)');
      
      if (statusParam) {
        query = query.eq('status', statusParam);
      }
      if (userRole === Role.EMPLOYEE) {
        query = query.or(`createdById.eq.${userId}`);
      }

      const { data, error } = await query.order('createdAt', { ascending: false });
      if (data && !error) {
        requests = data;
      }
    }

    // Post-process requests: Sort approval steps by order and ensure status is synchronized with real steps
    const processedRequests = (requests || []).map((req) => {
      let steps = Array.isArray(req.approvalSteps) ? [...req.approvalSteps] : [];
      steps.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

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

    return NextResponse.json({ success: true, data: processedRequests });
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
      submitImmediately = true,
    } = body;

    if (!purpose || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Purpose, destination, start date, and end date are required.' },
        { status: 400 }
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timeSuffix = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const trackingNumber = `TA-${dateStr}-${timeSuffix}${randomSuffix}`;

    const initialStatus = submitImmediately
      ? TARequestStatus.PENDING_SECTION_CHIEF
      : TARequestStatus.DRAFT;

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
          teamMembers: {
            create: teamMembers.map((member: { name: string; position?: string; userId?: string }) => ({
              name: member.name.trim(),
              position: member.position ? member.position.trim() : null,
              userId: member.userId || null,
            })),
          },
          approvalSteps: {
            create: [
              { order: 1, approverRole: Role.SECTION_CHIEF, action: ApprovalAction.PENDING },
              { order: 2, approverRole: Role.DIVISION_CHIEF, action: ApprovalAction.PENDING },
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
        })
        .select()
        .single();

      if (newReq && !reqErr) {
        request = newReq;

        // Insert approval steps
        await supabase.from('ApprovalStep').insert([
          { id: 'app_step_' + Math.random().toString(36).substring(2, 11), requestId: reqId, order: 1, approverRole: 'SECTION_CHIEF', action: 'PENDING' },
          { id: 'app_step_' + Math.random().toString(36).substring(2, 11), requestId: reqId, order: 2, approverRole: 'DIVISION_CHIEF', action: 'PENDING' },
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
      const taDetails = {
        trackingNumber: request.trackingNumber,
        destination: request.destination,
        destinationLat: request.destinationLat,
        destinationLng: request.destinationLng,
        startDate: request.startDate,
        endDate: request.endDate,
        status: 'PENDING_SECTION_CHIEF',
      };

      // Notify creator (Employee)
      await notifyUser({
        userId,
        requestId: request.id,
        title: 'TA Request Submitted',
        message: `Your Travel Authority request (${request.trackingNumber}) to ${destination} has been submitted for Section Chief approval.`,
        channel: 'BOTH',
        taDetails,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
      });

      // Notify all Section Chiefs about the new pending TA
      await notifyRole({
        role: Role.SECTION_CHIEF,
        requestId: request.id,
        title: 'New TA Request for Review',
        message: `New Travel Authority request (${request.trackingNumber}) by ${userName} to ${destination} is awaiting Section Chief verification.`,
        channel: 'BOTH',
        taDetails,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
      });
    }

    // Audit Log: Record TA creation/submission event
    if (request) {
      await logAuditEvent({
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
          ? `Submitted TA request to ${destination} for Section Chief approval.`
          : `Created TA request draft to ${destination}.`,
        metadata: {
          destination: destination.trim(),
          startDate,
          endDate,
          teamMembersCount: teamMembers.length,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'TA Request created successfully.',
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
