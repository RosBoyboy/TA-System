import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/lib/sms';
import { TARequestStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron trigger.' }, { status: 401 });
    }

    const now = new Date();
    let overdueRequests: Array<{
      id: string;
      trackingNumber: string;
      createdById: string;
      startDate: Date | string;
      destination?: string;
      destinationLat?: number | null;
      destinationLng?: number | null;
      endDate?: Date | string;
    }> = [];

    // 1. Find all pending/draft requests where startDate has passed via Prisma
    try {
      overdueRequests = await prisma.tARequest.findMany({
        where: {
          status: {
            in: [
              TARequestStatus.PENDING_SECTION_CHIEF,
              TARequestStatus.PENDING_DIVISION_CHIEF,
              TARequestStatus.PENDING_HEAD_PENRO,
              TARequestStatus.DRAFT,
            ],
          },
          startDate: {
            lt: now,
          },
        },
        select: {
          id: true,
          trackingNumber: true,
          createdById: true,
          startDate: true,
          destination: true,
          destinationLat: true,
          destinationLng: true,
          endDate: true,
        },
      });
    } catch (err) {
      console.warn('[Check Overdue Cron] Prisma query error, fallback to Supabase...', err);
      if (supabaseUrl && supabaseKey) {
        const { data: sbOverdue } = await supabase
          .from('TARequest')
          .select('id, trackingNumber, createdById, startDate, destination, destinationLat, destinationLng, endDate')
          .in('status', ['PENDING_SECTION_CHIEF', 'PENDING_DIVISION_CHIEF', 'PENDING_HEAD_PENRO', 'DRAFT'])
          .lt('startDate', now.toISOString());

        if (sbOverdue) {
          overdueRequests = sbOverdue;
        }
      }
    }

    if (overdueRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Cron check complete. No overdue TA requests found.',
        count: 0,
      });
    }

    const overdueIds = overdueRequests.map((r) => r.id);

    // Update status to terminal REJECTED_OVERDUE
    try {
      await prisma.tARequest.updateMany({
        where: { id: { in: overdueIds } },
        data: { status: TARequestStatus.REJECTED_OVERDUE },
      });
    } catch (updateErr) {
      console.warn('[Check Overdue Cron] Prisma update error, fallback to Supabase...', updateErr);
      if (supabaseUrl && supabaseKey) {
        await supabase
          .from('TARequest')
          .update({ status: 'REJECTED_OVERDUE' })
          .in('id', overdueIds);
      }
    }

    // Notify all affected users
    for (const reqItem of overdueRequests) {
      const overdueTaDetails = {
        trackingNumber: reqItem.trackingNumber,
        destination: reqItem.destination,
        destinationLat: reqItem.destinationLat,
        destinationLng: reqItem.destinationLng,
        startDate: reqItem.startDate,
        endDate: reqItem.endDate,
        status: 'REJECTED_OVERDUE',
        remarks: 'Travel start date passed before all approval levels were completed.',
      };

      await notifyUser({
        userId: reqItem.createdById,
        requestId: reqItem.id,
        title: 'TA Request Auto-Rejected (Overdue)',
        message: `Your TA Request (${reqItem.trackingNumber}) was automatically rejected because the travel start date (${new Date(reqItem.startDate).toLocaleDateString()}) passed before full approval was completed. This rejection is terminal — please submit a new request if needed.`,
        channel: 'BOTH',
        taDetails: overdueTaDetails,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/employee?tab=requests`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${overdueRequests.length} overdue TA requests.`,
      count: overdueRequests.length,
      processedIds: overdueIds,
    });
  } catch (error: any) {
    console.error('[Overdue Cron Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

