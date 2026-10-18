import { NextResponse } from 'next/server';
import { prisma, isDummyDbUrl } from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { OFFICIAL_DIVISIONS } from '@/lib/constants/organization';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    let divisions: any[] = [];

    // 1. Attempt Prisma query
    if (!isDummyDbUrl) {
      try {
        divisions = await prisma.division.findMany({
          include: {
            sections: {
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        });

        // Auto-seed if database table is empty
        if (divisions.length === 0) {
          for (const item of OFFICIAL_DIVISIONS) {
            const div = await prisma.division.upsert({
              where: { name: item.name },
              update: {},
              create: {
                id: item.id,
                name: item.name,
              },
            });

            for (const sec of item.sections) {
              await prisma.section.upsert({
                where: {
                  divisionId_name: {
                    divisionId: div.id,
                    name: sec.name,
                  },
                },
                update: {},
                create: {
                  id: sec.id,
                  name: sec.name,
                  divisionId: div.id,
                },
              });
            }
          }

          divisions = await prisma.division.findMany({
            include: {
              sections: {
                orderBy: { name: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          });
        }
      } catch (prismaErr) {
        console.warn('[Organization API] Prisma query/seed error, trying Supabase fallback...', prismaErr);
      }
    }

    // 2. Supabase Fallback if Prisma yielded nothing
    if ((!divisions || divisions.length === 0) && supabaseUrl && supabaseKey) {
      try {
        const { data: divData } = await supabase
          .from('Division')
          .select('id, name, sections:Section(id, name)')
          .order('name', { ascending: true });

        if (divData && divData.length > 0) {
          divisions = divData;
        }
      } catch (sbErr) {
        console.warn('[Organization API] Supabase fallback error:', sbErr);
      }
    }

    // 3. Fallback to official static list if DB returned nothing
    if (!divisions || divisions.length === 0) {
      divisions = OFFICIAL_DIVISIONS;
    }

    return NextResponse.json({
      success: true,
      data: divisions,
    });
  } catch (error: any) {
    console.error('[Organization API Error]', error);
    return NextResponse.json({
      success: true,
      data: OFFICIAL_DIVISIONS,
    });
  }
}
