import { prisma } from './prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : (null as any);

export interface AuditLogParams {
  actorId?: string | null;
  actorName: string;
  actorRole: string;
  ipAddress?: string | null;
  action: string;
  target: string;
  targetId?: string | null;
  trackingNumber?: string | null;
  requestId?: string | null;
  details?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Extracts the client IP address from an incoming HTTP request.
 * Checks common proxy headers first, then falls back to the request info.
 */
export function extractIpAddress(req: Request): string | null {
  // x-forwarded-for is set by most reverse proxies (Vercel, Cloudflare, nginx)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // May contain multiple IPs: "client, proxy1, proxy2" — take the first
    return forwarded.split(',')[0].trim();
  }

  // Vercel-specific header
  const vercelIp = req.headers.get('x-real-ip');
  if (vercelIp) return vercelIp.trim();

  // Cloudflare-specific header
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return null;
}

/**
 * Writes an immutable audit log event to the database.
 * This function is designed to NEVER throw — it fails silently with a console
 * warning so that audit logging never interrupts core business transactions.
 *
 * Usage:
 *   await logAuditEvent({
 *     actorId: userId,
 *     actorName: 'Juan Dela Cruz',
 *     actorRole: 'EMPLOYEE',
 *     ipAddress: extractIpAddress(req),
 *     action: 'SUBMITTED',
 *     target: 'TARequest',
 *     targetId: request.id,
 *     trackingNumber: request.trackingNumber,
 *     requestId: request.id,
 *     details: 'Submitted TA request to Regional Office',
 *     metadata: { destination: 'Baguio City', startDate: '2025-07-01' },
 *   });
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  const {
    actorId,
    actorName,
    actorRole,
    ipAddress,
    action,
    target,
    targetId,
    trackingNumber,
    requestId,
    details,
    metadata,
  } = params;

  // 1. Try Prisma first
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        actorName,
        actorRole,
        ipAddress: ipAddress || null,
        action,
        target,
        targetId: targetId || null,
        trackingNumber: trackingNumber || null,
        requestId: requestId || null,
        details: details || null,
        metadata: metadata || undefined,
      },
    });
    return;
  } catch (prismaErr) {
    console.warn('[AuditLog] Prisma insert error, falling back to Supabase REST...', prismaErr);
  }

  // 2. Supabase REST API fallback
  if (supabase) {
    try {
      const logId = 'audit_' + Math.random().toString(36).substring(2, 11);
      await supabase.from('AuditLog').insert({
        id: logId,
        timestamp: new Date().toISOString(),
        actorId: actorId || null,
        actorName,
        actorRole,
        ipAddress: ipAddress || null,
        action,
        target,
        targetId: targetId || null,
        trackingNumber: trackingNumber || null,
        requestId: requestId || null,
        details: details || null,
        metadata: metadata || null,
      });
    } catch (sbErr) {
      console.warn('[AuditLog] Supabase REST insert error (non-fatal):', sbErr);
    }
  }
}
