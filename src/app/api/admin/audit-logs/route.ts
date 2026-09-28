import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : (null as any);

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const actionFilter = url.searchParams.get('action');
    const trackingFilter = url.searchParams.get('trackingNumber');
    const limit = Math.min(parseInt(limitParam || '100', 10), 500);

    let auditLogs: any[] = [];

    // 1. Query dedicated AuditLog table via Prisma
    try {
      const whereClause: any = {};
      if (actionFilter && actionFilter !== 'ALL') {
        whereClause.action = actionFilter;
      }
      if (trackingFilter) {
        whereClause.trackingNumber = { contains: trackingFilter, mode: 'insensitive' };
      }

      auditLogs = await prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (prismaErr) {
      console.warn('[Audit Logs] Prisma query error, falling back to Supabase REST...', prismaErr);

      // 2. Supabase REST API fallback
      if (supabase) {
        try {
          let query = supabase
            .from('AuditLog')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

          if (actionFilter && actionFilter !== 'ALL') {
            query = query.eq('action', actionFilter);
          }
          if (trackingFilter) {
            query = query.ilike('trackingNumber', `%${trackingFilter}%`);
          }

          const { data, error } = await query;
          if (data && !error) {
            auditLogs = data;
          }
        } catch (sbErr) {
          console.warn('[Audit Logs] Supabase query error:', sbErr);
        }
      }
    }

    // Map to the format expected by the admin UI
    const formattedLogs = auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      user: log.actorName,
      role: log.actorRole,
      action: formatAction(log.action),
      target: log.target,
      trackingNumber: log.trackingNumber || 'N/A',
      ipAddress: log.ipAddress || '—',
      details: log.details || '',
      metadata: log.metadata || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedLogs,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Maps internal action codes to human-readable labels for the UI.
 */
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    SUBMITTED: 'Submitted',
    DRAFT_CREATED: 'Draft Created',
    APPROVED: 'Approved',
    REJECTED: 'Cancelled',
    RESUBMITTED: 'Resubmitted',
    AUTO_REJECTED: 'Auto-Rejected',
    LOGIN: 'Login',
    ACCOUNT_ACTIVATED: 'Account Activated',
  };
  return actionMap[action] || action;
}
