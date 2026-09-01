import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { UserStatus, Role } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== Role.ACCOUNT_MANAGER && userRole !== Role.ADMIN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Account Manager access required.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const roleFilter = searchParams.get('role') || '';

    let users: any[] = [];

    if (!isDummyDbUrl) {
      try {
        users = await prisma.user.findMany({
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            role: true,
            status: true,
            section: true,
            position: true,
            birthday: true,
            address: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        console.warn('[Account Manager Users GET] Prisma query error, fallback to Supabase...', err);
      }
    }

    if ((!users || users.length === 0) && supabaseUrl && supabaseKey) {
      const { data, error } = await supabase
        .from('User')
        .select('id, name, username, email, phoneNumber, role, status, section, position, birthday, address, createdAt, updatedAt')
        .order('createdAt', { ascending: false });

      if (data && !error) {
        users = data;
      }
    }

    const totalAccounts = users.length;
    const activeCount = users.filter((u) => u.status === 'ACTIVE' || u.status === UserStatus.ACTIVE).length;
    const pendingCount = users.filter((u) => u.status === 'PENDING_REVIEW' || u.status === UserStatus.PENDING_REVIEW).length;
    const inactiveCount = users.filter((u) => u.status === 'DEACTIVATED' || u.status === UserStatus.DEACTIVATED).length;
    const staffCount = users.filter((u) =>
      ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'].includes(u.role)
    ).length;
    const employeeCount = users.filter((u) => u.role === 'EMPLOYEE' || u.role === Role.EMPLOYEE).length;

    let filteredUsers = users;
    if (search) {
      const q = search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          u.email.toLowerCase().includes(q) ||
          (u.section && u.section.toLowerCase().includes(q)) ||
          (u.position && u.position.toLowerCase().includes(q)) ||
          u.role.toLowerCase().includes(q)
      );
    }
    if (statusFilter && statusFilter !== 'ALL') {
      filteredUsers = filteredUsers.filter((u) => u.status === statusFilter);
    }
    if (roleFilter && roleFilter !== 'ALL') {
      if (roleFilter === 'STAFF') {
        filteredUsers = filteredUsers.filter((u) =>
          ['SECTION_CHIEF', 'DIVISION_CHIEF', 'HEAD_PENRO'].includes(u.role)
        );
      } else {
        filteredUsers = filteredUsers.filter((u) => u.role === roleFilter);
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredUsers,
      counts: {
        total: totalAccounts,
        active: activeCount,
        pending: pendingCount,
        inactive: inactiveCount,
        staff: staffCount,
        employee: employeeCount,
      },
    });
  } catch (error: any) {
    console.error('[Account Manager Users API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch users.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== Role.ACCOUNT_MANAGER && userRole !== Role.ADMIN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Account Manager access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, phoneNumber, role, section, position, birthday, address, status } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const username = generateBaseUsername(name);
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);

    let newUser: any = null;

    if (!isDummyDbUrl) {
      try {
        const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existingUser) {
          return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 400 });
        }

        newUser = await prisma.user.create({
          data: {
            id: userId,
            name: name.trim(),
            username,
            email: cleanEmail,
            password: hashedPassword,
            phoneNumber: phoneNumber ? phoneNumber.trim() : '09170000000',
            role: role ? (role as Role) : Role.EMPLOYEE,
            section: section ? section.trim() : 'Planning Section',
            position: position ? position.trim() : null,
            birthday: birthday ? birthday.trim() : null,
            address: address ? address.trim() : null,
            status: status ? (status as UserStatus) : UserStatus.ACTIVE,
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phoneNumber: true,
            role: true,
            status: true,
            section: true,
            position: true,
            createdAt: true,
          },
        });
      } catch (err) {
        console.warn('[Create User API] Prisma create error, fallback to Supabase...', err);
      }
    }

    if (!newUser && supabaseUrl && supabaseKey) {
      const { data: existingSbUser } = await supabase.from('User').select('id').eq('email', cleanEmail).maybeSingle();
      if (existingSbUser) {
        return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 400 });
      }

      const { data: created, error: sbErr } = await supabase
        .from('User')
        .insert({
          id: userId,
          name: name.trim(),
          username,
          email: cleanEmail,
          password: hashedPassword,
          phoneNumber: phoneNumber ? phoneNumber.trim() : '09170000000',
          role: role || 'EMPLOYEE',
          section: section ? section.trim() : 'Planning Section',
          position: position ? position.trim() : null,
          birthday: birthday ? birthday.trim() : null,
          address: address ? address.trim() : null,
          status: status || 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select('id, name, username, email, phoneNumber, role, status, section, position, createdAt')
        .single();

      if (!sbErr && created) {
        newUser = created;
      } else {
        throw new Error(sbErr?.message || 'Failed to create user in database.');
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Account created successfully for ${newUser.name}. Username: '${username}', Default password: '${defaultPassword}'.`,
        data: newUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Create User API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user account.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== Role.ACCOUNT_MANAGER && userRole !== Role.ADMIN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Account Manager access required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action, status, role, section, position, password } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required.' },
        { status: 400 }
      );
    }

    let updateData: any = { updatedAt: new Date() };

    if (action === 'RESET_PASSWORD') {
      const newPass = password || 'password123';
      updateData.password = await bcrypt.hash(newPass, 10);
    } else if (action === 'TOGGLE_STATUS') {
      updateData.status = status;
    } else {
      if (status) updateData.status = status;
      if (role) updateData.role = role;
      if (section !== undefined) updateData.section = section;
      if (position !== undefined) updateData.position = position;
    }

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
            role: true,
            status: true,
            section: true,
            position: true,
          },
        });
      } catch (err) {
        console.warn('[Update User API] Prisma update error, fallback to Supabase...', err);
      }
    }

    if (!updatedUser && supabaseUrl && supabaseKey) {
      const sbPayload: any = { ...updateData };
      if (sbPayload.updatedAt instanceof Date) {
        sbPayload.updatedAt = sbPayload.updatedAt.toISOString();
      }
      const { data, error } = await supabase
        .from('User')
        .update(sbPayload)
        .eq('id', userId)
        .select('id, name, username, email, phoneNumber, role, status, section, position')
        .single();

      if (!error && data) {
        updatedUser = data;
      } else {
        throw new Error(error?.message || 'Failed to update user via Supabase REST.');
      }
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'RESET_PASSWORD'
          ? `Password reset successfully for ${updatedUser.name}.`
          : `User ${updatedUser.name} updated successfully.`,
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('[Update User API Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user.' },
      { status: 500 }
    );
  }
}
