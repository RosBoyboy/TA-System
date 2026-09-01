import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    let notifications: any[] = [];
    let unreadCount = 0;

    const isDummyDbUrl = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PASSWORD]');

    if (!isDummyDbUrl) {
      try {
        notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        unreadCount = await prisma.notification.count({
          where: { userId, isRead: false },
        });
      } catch (err) {
        console.warn('[GET Notifications] Prisma query error, using Supabase REST API fallback...', err);
      }
    }

    if (notifications.length === 0) {
      try {
        const { data } = await supabase
          .from('Notification')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false })
          .limit(50);

        if (data) {
          notifications = data;
          unreadCount = data.filter((n) => !n.isRead).length;
        }
      } catch (sbErr) {
        console.error('[GET Notifications] Supabase fallback error:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('[GET Notifications Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
