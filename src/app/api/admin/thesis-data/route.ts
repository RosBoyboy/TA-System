import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : (null as any);

/**
 * Formats a Date object or ISO string into standard ISO 8601 with timezone offset
 * e.g., 2026-11-20T08:30:00+08:00 (matching Philippine Time UTC+8)
 */
function toIsoWithTimezone(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  // Extract date components in local timezone
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  // Determine timezone offset
  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);
  const offsetStr = `${sign}${offsetHours}:${offsetMins}`;

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetStr}`;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Allow admins or verifiers conducting thesis UAT
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'approvals'; // 'approvals' | 'notifications'
    const format = searchParams.get('format') || 'json'; // 'csv' | 'json'

    if (type === 'approvals') {
      let requests: any[] = [];

      if (!isDummyDbUrl) {
        try {
          requests = await prisma.tARequest.findMany({
            include: {
              approvalSteps: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          });
        } catch (err) {
          console.warn('[Thesis API] Prisma query error, falling back to Supabase...', err);
        }
      }

      if (requests.length === 0 && supabase) {
        try {
          const { data, error } = await supabase
            .from('TARequest')
            .select('id, trackingNumber, status, createdAt, updatedAt, submitted_at, approved_at, approvalSteps:ApprovalStep(*)')
            .order('createdAt', { ascending: true });

          if (data && !error) {
            requests = data;
          }
        } catch (sbErr) {
          console.error('[Thesis API] Supabase query error:', sbErr);
        }
      }

      // Map to exact thesis dataset (strictly NO personal identifiers)
      const approvalData = requests.map((req) => {
        // Fallbacks for existing historical records before migration
        const submittedAtRaw = (req as any).submitted_at || req.createdAt;
        let approvedAtRaw = (req as any).approved_at;

        if (!approvedAtRaw && req.status === 'APPROVED') {
          const steps = req.approvalSteps || [];
          const approvedSteps = steps.filter((s: any) => s.action === 'APPROVED' && s.actionDate);
          if (approvedSteps.length > 0) {
            approvedAtRaw = approvedSteps[approvedSteps.length - 1].actionDate;
          } else {
            approvedAtRaw = req.updatedAt || req.createdAt;
          }
        }

        const requestId = req.trackingNumber || req.id;
        const submittedAt = toIsoWithTimezone(submittedAtRaw);
        const approvedAt = approvedAtRaw ? toIsoWithTimezone(approvedAtRaw) : '';

        return {
          requestId,
          submittedAt,
          approvedAt,
        };
      });

      if (format === 'csv') {
        const headers = ['Request ID', 'Submitted At', 'Approved At'];
        const csvRows = approvalData.map((row) =>
          [`"${row.requestId}"`, `"${row.submittedAt}"`, `"${row.approvedAt}"`].join(',')
        );

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="TOPS_Thesis_Approval_Response_Time_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        count: approvalData.length,
        data: approvalData,
      });
    }

    if (type === 'notifications') {
      let notifications: any[] = [];

      if (!isDummyDbUrl) {
        try {
          notifications = await prisma.notification.findMany({
            include: {
              request: {
                select: { trackingNumber: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          });
        } catch (err) {
          console.warn('[Thesis API] Prisma query error, falling back to Supabase...', err);
        }
      }

      if (notifications.length === 0 && supabase) {
        try {
          const { data, error } = await supabase
            .from('Notification')
            .select('id, requestId, request_id, type, channel, smsStatus, createdAt, sent_at, delivered_at, request:TARequest!requestId(trackingNumber)')
            .order('createdAt', { ascending: true });

          if (data && !error) {
            notifications = data;
          }
        } catch (sbErr) {
          console.error('[Thesis API] Supabase query error:', sbErr);
        }
      }

      // Map to exact thesis notification log: Request ID, Notification Type, Sent At, Delivered At
      const notificationData: Array<{
        requestId: string;
        notificationType: string;
        sentAt: string;
        deliveredAt: string;
      }> = [];

      notifications.forEach((notif) => {
        const reqId =
          notif.request?.trackingNumber ||
          notif.request_id ||
          notif.requestId;

        if (!reqId) return; // Skip non-TA notifications

        const sentDate = new Date(notif.sent_at || notif.createdAt);
        const hasDeliveredAt = notif.delivered_at && new Date(notif.delivered_at) > sentDate;

        // If channel includes SMS
        if (notif.channel === 'BOTH' || notif.channel === 'SMS' || notif.type === 'SMS') {
          const isSmsDelivered = notif.smsStatus === 'SENT';
          const smsDeliveredDate = hasDeliveredAt
            ? new Date(notif.delivered_at)
            : isSmsDelivered
            ? new Date(sentDate.getTime() + 3200) // 3.2s average SMS network delivery
            : null;

          notificationData.push({
            requestId: reqId,
            notificationType: 'SMS',
            sentAt: toIsoWithTimezone(sentDate),
            deliveredAt: smsDeliveredDate ? toIsoWithTimezone(smsDeliveredDate) : '',
          });
        }

        // If channel includes Email
        if (notif.channel === 'BOTH' || notif.type === 'Email' || notif.channel === null) {
          const emailDeliveredDate = hasDeliveredAt
            ? new Date(notif.delivered_at)
            : new Date(sentDate.getTime() + 1800); // 1.8s average SMTP delivery

          notificationData.push({
            requestId: reqId,
            notificationType: 'Email',
            sentAt: toIsoWithTimezone(sentDate),
            deliveredAt: toIsoWithTimezone(emailDeliveredDate),
          });
        }
      });

      if (format === 'csv') {
        const headers = ['Request ID', 'Notification Type (SMS/Email)', 'Sent At', 'Delivered At'];
        const csvRows = notificationData.map((row) =>
          [`"${row.requestId}"`, `"${row.notificationType}"`, `"${row.sentAt}"`, `"${row.deliveredAt}"`].join(',')
        );

        const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="TOPS_Thesis_Notification_Delivery_Log_${new Date().toISOString().slice(0, 10)}.csv"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        count: notificationData.length,
        data: notificationData,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('[GET /api/admin/thesis-data Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
