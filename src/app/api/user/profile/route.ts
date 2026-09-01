import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/user/profile
 * Retrieves current profile details for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    let user: any = null;

    if (!isDummyDbUrl) {
      try {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            image: true,
            role: true,
            status: true,
            section: true,
            position: true,
            birthday: true,
            address: true,
            createdAt: true,
          },
        });
      } catch (err) {
        console.warn('[GET Profile] Prisma query error, fallback to Supabase...', err);
      }
    }

    if (!user && supabaseUrl && supabaseKey) {
      const { data, error } = await supabase
        .from('User')
        .select('id, name, username, email, phoneNumber, image, role, status, section, position, birthday, address, createdAt')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        user = data;
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error('[GET Profile Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Updates user profile: Name, Phone / SMS number, Email, Birthday, Address, Position, Profile Picture (image), or Password
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, email, phoneNumber, image, section, position, birthday, address, currentPassword, newPassword } = body;

    // Fetch existing user
    let existingUser: any = null;
    if (!isDummyDbUrl) {
      try {
        existingUser = await prisma.user.findUnique({ where: { id: userId } });
      } catch (err) {
        console.warn('[PATCH Profile] Prisma find user error, fallback to Supabase...', err);
      }
    }

    if (!existingUser && supabaseUrl && supabaseKey) {
      const { data } = await supabase.from('User').select('*').eq('id', userId).maybeSingle();
      existingUser = data;
    }

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // 1. Name update
    if (name && typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    // 2. Phone / SMS Number update (clean digits and validate)
    if (phoneNumber !== undefined) {
      const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '').trim();
      if (cleanPhone.length > 0) {
        updateData.phoneNumber = cleanPhone;
      }
    }

    // 3. Email update (check duplicates, updates notification email without altering username)
    if (email && typeof email === 'string') {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== (existingUser.email || '').toLowerCase()) {
        let duplicate: any = null;
        if (!isDummyDbUrl) {
          try {
            duplicate = await prisma.user.findUnique({ where: { email: cleanEmail } });
          } catch {}
        }
        if (!duplicate && supabaseUrl && supabaseKey) {
          const { data } = await supabase.from('User').select('id').eq('email', cleanEmail).maybeSingle();
          duplicate = data;
        }
        if (duplicate && duplicate.id !== userId) {
          return NextResponse.json(
            { success: false, error: 'This email address is already in use by another account.' },
            { status: 400 }
          );
        }
        updateData.email = cleanEmail;
      }
    }

    // 4. Profile Picture (image) update
    if (image !== undefined) {
      updateData.image = image;
    }

    // 5. Section update (optional)
    if (section !== undefined && typeof section === 'string') {
      updateData.section = section.trim();
    }

    // 6. Position update (optional)
    if (position !== undefined && typeof position === 'string') {
      updateData.position = position.trim();
    }

    // 7. Birthday update (optional)
    if (birthday !== undefined) {
      updateData.birthday = birthday ? birthday.trim() : null;
    }

    // 8. Address update (optional)
    if (address !== undefined) {
      updateData.address = address ? address.trim() : null;
    }

    // 9. Password Change (if requested)
    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Current password is required to set a new password.' },
          { status: 400 }
        );
      }
      if (newPassword.trim().length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, existingUser.password);
      if (!isCurrentValid) {
        return NextResponse.json(
          { success: false, error: 'The current password you entered is incorrect.' },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    // Apply DB update
    let updatedUser: any = null;

    if (!isDummyDbUrl) {
      try {
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            image: true,
            role: true,
            status: true,
            section: true,
            position: true,
            birthday: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (prismaErr) {
        console.warn('[PATCH Profile] Prisma update failed, fallback to Supabase REST...', prismaErr);
      }
    }

    if (!updatedUser && supabaseUrl && supabaseKey) {
      const sbPayload: Record<string, any> = { ...updateData };
      if (sbPayload.updatedAt instanceof Date) {
        sbPayload.updatedAt = sbPayload.updatedAt.toISOString();
      }

      const { data: sbUser, error: sbErr } = await supabase
        .from('User')
        .update(sbPayload)
        .eq('id', userId)
        .select('id, name, username, email, phoneNumber, image, role, status, section, position, birthday, address, createdAt, updatedAt')
        .single();

      if (!sbErr && sbUser) {
        updatedUser = sbUser;
      } else {
        throw new Error(sbErr?.message || 'Failed to update profile in database.');
      }
    }

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully!',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('[PATCH Profile Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
