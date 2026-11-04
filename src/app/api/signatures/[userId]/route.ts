import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { getSignatureBuffer, saveSignatureFile } from '@/lib/signatureStorage';
import { Role } from '@prisma/client';
import { logAuditEvent } from '@/lib/auditLog';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const currentUserId = (session.user as any)?.id;
    const currentUserRole = (session.user as any)?.role;

    // Access control:
    // 1. User themselves
    // 2. Account Manager or Admin
    // 3. Signatory roles (SECTION_CHIEF, DIVISION_CHIEF, HEAD_PENRO) verifying documents
    const isSelf = currentUserId === userId;
    const isManagerOrAdmin =
      currentUserRole === 'ACCOUNT_MANAGER' ||
      currentUserRole === 'ADMIN' ||
      currentUserRole === Role.ACCOUNT_MANAGER ||
      currentUserRole === Role.ADMIN;
    const isSignatory =
      ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'].includes(currentUserRole) ||
      [Role.SECTION_CHIEF, Role.DIVISION_CHIEF, Role.HEAD_PENRO].includes(currentUserRole as any);

    if (!isSelf && !isManagerOrAdmin && !isSignatory) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch user signatureUrl
    let userRecord: any = null;

    if (!isDummyDbUrl) {
      try {
        userRecord = await prisma.user.findUnique({
          where: { id: userId },
          select: { signatureUrl: true },
        });
      } catch (err) {
        console.warn('[Signature API] Prisma query error, fallback to Supabase...', err);
      }
    }

    if (!userRecord && supabaseUrl && supabaseKey) {
      const { data } = await supabase
        .from('User')
        .select('signatureUrl')
        .eq('id', userId)
        .maybeSingle();
      if (data) userRecord = data;
    }

    if (!userRecord || !userRecord.signatureUrl) {
      return NextResponse.json({ success: false, error: 'Signature not found' }, { status: 404 });
    }

    const buffer = await getSignatureBuffer(userRecord.signatureUrl);
    if (!buffer) {
      return NextResponse.json({ success: false, error: 'Signature image could not be loaded' }, { status: 404 });
    }

    const contentType = userRecord.signatureUrl.startsWith('data:image/jpeg')
      ? 'image/jpeg'
      : userRecord.signatureUrl.startsWith('data:image/svg')
      ? 'image/svg+xml'
      : 'image/png';

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('[GET Signature API Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve signature' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const userId = resolvedParams?.userId;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const currentUserId = (session.user as any)?.id;
    const currentUserRole = (session.user as any)?.role;

    const isSelf = currentUserId === userId;
    const isManagerOrAdmin =
      currentUserRole === 'ACCOUNT_MANAGER' ||
      currentUserRole === 'ADMIN' ||
      currentUserRole === Role.ACCOUNT_MANAGER ||
      currentUserRole === Role.ADMIN;

    if (!isSelf && !isManagerOrAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { signatureData } = body;

    if (!signatureData || typeof signatureData !== 'string' || !signatureData.trim()) {
      return NextResponse.json({ success: false, error: 'Valid signatureData is required' }, { status: 400 });
    }

    const savedSignatureUrl = await saveSignatureFile(userId, signatureData);

    let updatedUser: any = null;

    if (!isDummyDbUrl) {
      try {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { signatureUrl: savedSignatureUrl, updatedAt: new Date() },
          select: { id: true, name: true, username: true, role: true, signatureUrl: true },
        });
      } catch (err) {
        console.warn('[POST Signature API] Prisma update fallback to Supabase...', err);
      }
    }

    if (!updatedUser && supabaseUrl && supabaseKey) {
      const { data, error } = await supabase
        .from('User')
        .update({ signatureUrl: savedSignatureUrl, updatedAt: new Date().toISOString() })
        .eq('id', userId)
        .select('id, name, username, role, signatureUrl')
        .single();

      if (!error && data) {
        updatedUser = data;
      }
    }

    // Audit log
    await logAuditEvent({
      actorId: currentUserId,
      actorName: (session.user as any)?.name || 'User',
      actorRole: currentUserRole,
      action: 'USER_SIGNATURE_UPDATED',
      target: 'User',
      targetId: userId,
      details: `Official e-signature updated for user ${updatedUser?.name || userId}.`,
      metadata: {
        userId,
        updatedBy: currentUserId,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Official e-signature saved successfully.',
      signatureUrl: savedSignatureUrl,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('[POST Signature API Error]', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to save signature' }, { status: 500 });
  }
}
