import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendSms } from '@/lib/sms';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, message } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const textMessage =
      message ||
      `[ETAPS] Live SMS test from DENR-PENRO ETAPS System. Timestamp: ${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Manila' })}`;

    const sent = await sendSms({
      to: phoneNumber,
      message: textMessage,
    });

    return NextResponse.json({
      success: sent,
      recipient: phoneNumber,
      message: textMessage,
      gateway: 'PhilSMS (with Semaphore fallback)',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch test SMS' },
      { status: 500 }
    );
  }
}
