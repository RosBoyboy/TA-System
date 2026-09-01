import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { UserStatus, Role } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phoneNumber, position, section, birthday, address } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Full Name is required.' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ success: false, error: 'Email Address is required for official notifications.' }, { status: 400 });
    }
    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json({ success: false, error: 'Phone Number is required for SMS alerts.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '').trim();
    const userId = 'user_reg_' + Math.random().toString(36).substring(2, 11);

    // Secure initial temporary placeholder password pending Account Manager review & activation
    const initialPlaceholderHash = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(), 10);

    let user: any = null;

    // Check if email is already taken
    if (!isDummyDbUrl) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });

        if (existingUser) {
          return NextResponse.json(
            { success: false, error: 'An employee account with this email address already exists.' },
            { status: 400 }
          );
        }

        user = await prisma.user.create({
          data: {
            id: userId,
            name: name.trim(),
            email: cleanEmail,
            password: initialPlaceholderHash,
            phoneNumber: cleanPhone,
            position: position ? position.trim() : null,
            section: section ? section.trim() : null,
            birthday: birthday ? birthday.trim() : null,
            address: address ? address.trim() : null,
            role: Role.EMPLOYEE,
            status: UserStatus.PENDING_REVIEW,
          },
          select: {
            id: true,
            name: true,
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
        });
      } catch (err) {
        console.warn('[Register API] Prisma error, using Supabase REST API fallback...', err);
      }
    }

    if (!user && supabaseUrl && supabaseKey) {
      const { data: existingSbUser } = await supabase
        .from('User')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingSbUser) {
        return NextResponse.json(
          { success: false, error: 'An employee account with this email address already exists.' },
          { status: 400 }
        );
      }

      const { data: newUser, error: createErr } = await supabase
        .from('User')
        .insert({
          id: userId,
          name: name.trim(),
          email: cleanEmail,
          password: initialPlaceholderHash,
          phoneNumber: cleanPhone,
          position: position ? position.trim() : null,
          section: section ? section.trim() : null,
          birthday: birthday ? birthday.trim() : null,
          address: address ? address.trim() : null,
          role: 'EMPLOYEE',
          status: 'PENDING_REVIEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id, name, email, phoneNumber, position, section, birthday, address, role, status, createdAt')
        .single();

      if (createErr || !newUser) {
        throw new Error(createErr?.message || 'Failed to submit registration in database.');
      }

      user = newUser;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Registration submitted successfully. The Account Manager will review your credentials and generate your account login.',
        data: user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Register API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
