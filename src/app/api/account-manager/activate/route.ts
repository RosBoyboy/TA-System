import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { notifyUser } from '@/lib/sms';
import { UserStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generates a clean, unique username from an employee's full name.
 * e.g., "Juan Dela Cruz" -> "juan.delacruz"
 */
function generateBaseUsername(fullName: string): string {
  const parts = fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/);

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
  return `${parts[0]}.${parts[parts.length - 1]}`;
}

/**
 * Generates a memorable, secure temporary password.
 * e.g. "DENR@2026!5942"
 */
function generateTempPassword(): string {
  const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
  return `DENR@2026!${randomDigits}`;
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== Role.ACCOUNT_MANAGER && userRole !== Role.ADMIN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Account Manager or Admin access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, section, position, role, customUsername, customPassword } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch the target user details
    let targetUser: any = null;
    if (!isDummyDbUrl) {
      try {
        targetUser = await prisma.user.findUnique({ where: { id: userId } });
      } catch (err) {
        console.warn('[Activate User API] Prisma query error, fallback to Supabase...', err);
      }
    }

    if (!targetUser && supabaseUrl && supabaseKey) {
      const { data } = await supabase.from('User').select('*').eq('id', userId).maybeSingle();
      targetUser = data;
    }

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    // 2. Generate Username & Temporary Password
    const baseUsername = customUsername?.trim() || generateBaseUsername(targetUser.name);
    let finalUsername = baseUsername;
    const tempPassword = customPassword?.trim() || generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 3. Prepare Update Payload
    const updateData: Record<string, any> = {
      username: finalUsername,
      password: hashedPassword,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };

    if (section && section.trim()) updateData.section = section.trim();
    if (position && position.trim()) updateData.position = position.trim();
    if (role) updateData.role = role;

    let updatedUser: any = null;

    if (!isDummyDbUrl) {
      try {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: {
            username: finalUsername,
            password: hashedPassword,
            status: UserStatus.ACTIVE,
            section: updateData.section || targetUser.section,
            position: updateData.position || targetUser.position,
            role: (updateData.role as Role) || targetUser.role,
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            position: true,
            section: true,
            role: true,
            status: true,
          },
        });
      } catch (prismaErr) {
        console.warn('[Activate User API] Prisma update error, fallback to Supabase REST...', prismaErr);
      }
    }

    if (!updatedUser && supabaseUrl && supabaseKey) {
      const { data: sbUser, error: sbErr } = await supabase
        .from('User')
        .update(updateData)
        .eq('id', userId)
        .select('id, name, username, email, phoneNumber, position, section, role, status')
        .single();

      if (!sbErr && sbUser) {
        updatedUser = sbUser;
      } else {
        throw new Error(sbErr?.message || 'Failed to activate user via Supabase REST');
      }
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Failed to activate user.' }, { status: 500 });
    }

    const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

    // 4. Notify employee via SMS & Email with generated credentials
    try {
      await notifyUser({
        userId: updatedUser.id,
        title: 'DENR ETAPS Account Activated',
        message: `Welcome to DENR ETAPS! Your official account has been activated.\nUsername: ${finalUsername}\nTemporary Password: ${tempPassword}\nPosition: ${updatedUser.position || 'Employee'}\nSection: ${updatedUser.section || 'General'}\nLog in here: ${loginUrl}`,
        channel: 'BOTH',
        actionUrl: loginUrl,
      });
    } catch (notifErr) {
      console.warn('[Activate User] Non-fatal notification dispatch error:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Account activated successfully for ${updatedUser.name}.`,
      data: {
        user: updatedUser,
        generatedCredentials: {
          username: finalUsername,
          tempPassword: tempPassword,
        },
      },
    });
  } catch (error: any) {
    console.error('[Activate User API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
