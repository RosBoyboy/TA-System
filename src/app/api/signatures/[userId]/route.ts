import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { getSignatureBuffer } from '@/lib/signatureStorage';
import { Role } from '@prisma/client';

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
      return NextResponse.json({ success: false, error: 'Signature file not found on disk' }, { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[GET Signature API Error]', error);
    return NextResponse.json({ success: false, error: 'Failed to retrieve signature' }, { status: 500 });
  }
}
