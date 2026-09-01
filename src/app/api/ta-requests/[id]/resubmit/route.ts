import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyUser, notifyRole } from '@/lib/sms';
import { createClient } from '@supabase/supabase-js';
import { TARequestStatus, ApprovalAction, Role } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'An Employee';
    const { id: requestId } = await params;

    const body = await req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'New start date and end date are required for resubmission.' },
        { status: 400 }
      );
    }

    let request: any = null;
    let usePrisma = true;

    try {
      request = await prisma.tARequest.findUnique({
        where: { id: requestId },
        include: { approvalSteps: true },
      });
    } catch (prismaErr) {
      console.warn('[Resubmit API] Prisma query error, falling back to Supabase REST API...', prismaErr);
      usePrisma = false;
    }

    if (!request) {
      try {
        const { data: reqData, error: reqErr } = await supabase
          .from('TARequest')
          .select('*, approvalSteps:ApprovalStep(*)')
          .eq('id', requestId)
          .single();

        if (reqErr || !reqData) {
          return NextResponse.json({ success: false, error: 'TA Request not found.' }, { status: 404 });
        }
        request = reqData;
        usePrisma = false;
      } catch (sbFetchErr) {
        return NextResponse.json({ success: false, error: 'TA Request not found.' }, { status: 404 });
      }
    }

    if (!request) {
      return NextResponse.json({ success: false, error: 'TA Request not found.' }, { status: 404 });
    }

    // Verify creator authorization
    if (request.createdById !== userId) {
      return NextResponse.json({ success: false, error: 'Only the request creator can resubmit.' }, { status: 403 });
    }

    // Verify status is REJECTED_MANUAL (NOT terminal REJECTED_OVERDUE)
    if (request.status === 'REJECTED_OVERDUE') {
      return NextResponse.json(
        { success: false, error: 'This request was rejected due to overdue date and is terminal. Resubmission is not permitted. Please create a new request.' },
        { status: 400 }
      );
    }

    if (request.status !== 'REJECTED_MANUAL') {
      return NextResponse.json(
        { success: false, error: 'Only manually rejected requests can be resubmitted.' },
        { status: 400 }
      );
    }

    let updatedRequest: any = null;

    if (usePrisma) {
      try {
        updatedRequest = await prisma.$transaction(async (tx) => {
          await tx.approvalStep.updateMany({
            where: { requestId },
            data: {
              action: ApprovalAction.PENDING,
              approverId: null,
              remarks: null,
              actionDate: null,
            },
          });

          return await tx.tARequest.update({
            where: { id: requestId },
            data: {
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              status: TARequestStatus.PENDING_SECTION_CHIEF,
              resubmitCount: { increment: 1 },
            },
          });
        });
      } catch (txErr) {
        console.warn('[Resubmit API] Prisma transaction error, falling back to Supabase REST API...', txErr);
        usePrisma = false;
      }
    }

    if (!usePrisma) {
      await supabase
        .from('ApprovalStep')
        .update({
          action: 'PENDING',
          approverId: null,
          remarks: null,
          actionDate: null,
        })
        .eq('requestId', requestId);

      const { data: sbUpdated } = await supabase
        .from('TARequest')
        .update({
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status: 'PENDING_SECTION_CHIEF',
          resubmitCount: (request.resubmitCount || 0) + 1,
        })
        .eq('id', requestId)
        .select('*')
        .single();

      updatedRequest = sbUpdated || { ...request, status: 'PENDING_SECTION_CHIEF' };
    }

    const trackingNum = updatedRequest.trackingNumber || request.trackingNumber;
    const taDetails = {
      trackingNumber: trackingNum,
      destination: updatedRequest.destination || request.destination,
      destinationLat: updatedRequest.destinationLat || request.destinationLat,
      destinationLng: updatedRequest.destinationLng || request.destinationLng,
      startDate: updatedRequest.startDate || request.startDate,
      endDate: updatedRequest.endDate || request.endDate,
      status: 'PENDING_SECTION_CHIEF',
    };

    // 1. Notify creator employee
    await notifyUser({
      userId,
      requestId: updatedRequest.id,
      title: 'TA Request Resubmitted',
      message: `Your TA Request (${trackingNum}) travel dates have been updated. The approval chain has been restarted at Section Chief.`,
      channel: 'BOTH',
      taDetails,
      actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
    });

    // 2. Notify all Section Chiefs about the resubmission
    await notifyRole({
      role: Role.SECTION_CHIEF,
      requestId: updatedRequest.id,
      title: 'Resubmitted TA Awaiting Verification',
      message: `TA Request (${trackingNum}) by ${userName} has been resubmitted with updated travel dates and is awaiting Section Chief verification.`,
      channel: 'BOTH',
      taDetails,
      actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/staff?tab=pending`,
    });

    return NextResponse.json({
      success: true,
      message: 'TA Request resubmitted successfully. Approval restarted at Section Chief.',
      data: updatedRequest,
    });
  } catch (error: any) {
    console.error('[Resubmit API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
