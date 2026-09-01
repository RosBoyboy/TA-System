import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      try {
        await prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        });
      } catch (err) {
        console.warn('[Mark Read Notification] Prisma fallback to Supabase...', err);
        if (supabaseUrl && supabaseKey) {
          await supabase
            .from('Notification')
            .update({ isRead: true })
            .eq('userId', userId)
            .eq('isRead', false);
        }
      }
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID or markAll flag is required.' },
        { status: 400 }
      );
    }

    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
    } catch (err) {
      console.warn('[Mark Read Notification] Prisma fallback to Supabase...', err);
      if (supabaseUrl && supabaseKey) {
        await supabase
          .from('Notification')
          .update({ isRead: true })
          .eq('id', notificationId)
          .eq('userId', userId);
      }
    }

    return NextResponse.json({ success: true, message: 'Notification marked as read.' });
  } catch (error: any) {
    console.error('[Mark Read Notification Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

