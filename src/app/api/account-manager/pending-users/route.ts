import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { UserStatus, Role } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== Role.ACCOUNT_MANAGER && userRole !== Role.ADMIN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Account Manager or Admin access required.' },
        { status: 403 }
      );
    }

    let pendingUsers: any[] = [];

    if (!isDummyDbUrl) {
      try {
        pendingUsers = await prisma.user.findMany({
          where: { status: UserStatus.PENDING_REVIEW },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            position: true,
            section: true,
            birthday: true,
            address: true,
            role: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('[Pending Users API] Prisma error, using Supabase REST API fallback...', err);
      }
    }

    if ((!pendingUsers || pendingUsers.length === 0) && supabaseUrl && supabaseKey) {
      const { data, error } = await supabase
        .from('User')
        .select('id, name, username, email, phoneNumber, position, section, birthday, address, role, status, createdAt')
        .eq('status', 'PENDING_REVIEW')
        .order('createdAt', { ascending: false });

      if (data && !error) {
        pendingUsers = data;
      }
    }

    return NextResponse.json({ success: true, data: pendingUsers || [] });
  } catch (error: any) {
    console.error('[Pending Users API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
