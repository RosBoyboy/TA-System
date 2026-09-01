import { NextResponse } from 'next/server';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

// Non-person alias names and system administrator accounts to exclude from employee travel selection
const EXCLUDED_NAMES = new Set([
  'Account Manager',
  'Section Chief User',
  'System Admin',
]);

/**
 * GET /api/employees
 * Retrieves all active employees with Name and Position / Designation for the Create Travel dropdown
 */
export async function GET() {
  try {
    let rawEmployees: any[] = [];

    // Attempt 1: Query via Prisma (if direct connection is enabled)
    if (!isDummyDbUrl) {
      try {
        rawEmployees = await prisma.user.findMany({
          where: {
            status: 'ACTIVE',
          },
          select: {
            id: true,
            name: true,
            position: true,
            email: true,
            role: true,
            section: true,
          },
          orderBy: {
            name: 'asc',
          },
        });
      } catch (prismaErr) {
        // Fallback silently to Supabase REST
      }
    }

    // Attempt 2: Fallback to Supabase REST Client
    if ((!rawEmployees || rawEmployees.length === 0) && supabaseUrl && supabaseKey) {
      const { data, error } = await supabase
        .from('User')
        .select('id, name, position, email, role, section')
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });

      if (data && !error) {
        rawEmployees = data;
      }
    }

    // Clean, filter out non-alias system names, and format output list
    const employees = (rawEmployees || [])
      .filter(
        (emp) =>
          emp.name &&
          emp.name.trim().length > 0 &&
          !EXCLUDED_NAMES.has(emp.name.trim()) &&
          emp.role !== 'ADMIN' &&
          emp.role !== 'ACCOUNT_MANAGER'
      )
      .map((emp) => ({
        id: emp.id,
        name: emp.name.trim(),
        position: emp.position ? emp.position.trim() : 'Environmental Specialist',
        email: emp.email || '',
        role: emp.role || 'EMPLOYEE',
        section: emp.section || null,
      }));

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (error: any) {
    console.error('[GET /api/employees Error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
