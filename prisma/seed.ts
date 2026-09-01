import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rltypymiubbwdhbthsky.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_0h-ghZuNv6gwbWXAAcUdqg_NXpuvBQ9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🌱 Starting TAPS database seed...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  const seedUsers = [
    {
      id: 'user_admin_001',
      name: 'System Admin',
      username: 'admin',
      email: 'admin@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000001',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      section: 'IT & Administration',
      position: 'Information Technology Officer I',
      birthday: '1988-03-15',
      address: 'PENRO Compound, San Fernando',
    },
    {
      id: 'user_acctmgr_002',
      name: 'Account Manager',
      username: 'acctmgr',
      email: 'acctmgr@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000002',
      role: Role.ACCOUNT_MANAGER,
      status: UserStatus.ACTIVE,
      section: 'Human Resources',
      position: 'Administrative Officer IV (HRMO)',
      birthday: '1990-07-22',
      address: 'Brgy. 5, Butuan City',
    },
    {
      id: 'user_secchief_003',
      name: 'Section Chief User',
      username: 'sectionchief',
      email: 'sectionchief@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000003',
      role: Role.SECTION_CHIEF,
      status: UserStatus.ACTIVE,
      section: 'Conservation Section',
      position: 'Chief, Conservation Section',
      birthday: '1985-11-04',
      address: 'Brgy. Libertad, Butuan City',
    },
    {
      id: 'user_divchief_004',
      name: 'Division Chief User',
      username: 'divchief',
      email: 'divchief@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000004',
      role: Role.DIVISION_CHIEF,
      status: UserStatus.ACTIVE,
      section: 'Technical Services Division',
      position: 'Chief, Technical Services Division',
      birthday: '1980-05-18',
      address: 'Brgy. Villa Kananga, Butuan City',
    },
    {
      id: 'user_headpenro_005',
      name: 'Head of PENRO',
      username: 'headpenro',
      email: 'headpenro@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000005',
      role: Role.HEAD_PENRO,
      status: UserStatus.ACTIVE,
      section: 'PENRO Executive Office',
      position: 'Provincial Environment and Natural Resources Officer',
      birthday: '1975-09-30',
      address: 'Capitol Complex, Butuan City',
    },
    {
      id: 'user_emp_006',
      name: 'Juan Dela Cruz (Employee)',
      username: 'employee',
      email: 'employee@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000006',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      section: 'Forest Management Section',
      position: 'Administrative Officer V',
      birthday: '1995-12-10',
      address: 'Brgy. Ampayon, Butuan City',
    },
    {
      id: 'user_pending_007',
      name: 'Maria Santos (Pending)',
      username: 'pending_emp',
      email: 'pending_emp@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000007',
      role: Role.EMPLOYEE,
      status: UserStatus.PENDING_REVIEW,
      section: 'Planning Section',
      position: 'Planning Assistant',
      birthday: '1998-02-14',
      address: 'Brgy. Bancasi, Butuan City',
    },
    // Planning Section (Organizational Chart Reference)
    {
      id: 'emp_plan_001',
      name: 'Alexandra M. Reyes',
      username: 'alexandra.reyes',
      email: 'alexandra.reyes@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000011',
      role: Role.SECTION_CHIEF,
      status: UserStatus.ACTIVE,
      section: 'Planning Section',
      position: 'Planning Officer III — Chief, Planning Section',
      birthday: '1986-04-12',
      address: 'Brgy. Doongan, Butuan City',
    },
    {
      id: 'emp_plan_002',
      name: 'Miguel A. Santos',
      username: 'miguel.santos',
      email: 'miguel.santos@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000012',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      section: 'Plans & Program Unit',
      position: 'Planning Officer II',
      birthday: '1992-08-25',
      address: 'Brgy. Holy Redeemer, Butuan City',
    },
    {
      id: 'emp_plan_003',
      name: 'Gabriel D. Navarro',
      username: 'gabriel.navarro',
      email: 'gabriel.navarro@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000013',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      section: 'Monitoring & Evaluation Unit',
      position: 'Planning Officer I',
      birthday: '1994-01-19',
      address: 'Brgy. San Vicente, Butuan City',
    },
    {
      id: 'emp_plan_004',
      name: 'Daniel P. Castillo',
      username: 'daniel.castillo',
      email: 'daniel.castillo@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000014',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      section: 'Information & Communications Technology Unit',
      position: 'Information System Analyst II — Chief, ICT Unit',
      birthday: '1991-06-30',
      address: 'Brgy. Taguibo, Butuan City',
    },
    {
      id: 'emp_plan_005',
      name: 'Claire T. Mendoza',
      username: 'claire.mendoza',
      email: 'claire.mendoza@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000015',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      section: 'Information & Communications Technology Unit',
      position: 'Administrative Assistant III — ICT Unit',
      birthday: '1996-10-08',
      address: 'Brgy. Baan, Butuan City',
    },
    {
      id: 'emp_plan_006',
      name: 'Ethan R. Bautista',
      username: 'ethan.bautista',
      email: 'ethan.bautista@denr.gov.ph',
      password: defaultPassword,
      phoneNumber: '09170000016',
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      section: 'Information & Communications Technology Unit',
      position: 'Forest Ranger — ICT Unit / OIC, Technical Support',
      birthday: '1997-03-27',
      address: 'Brgy. Los Angeles, Butuan City',
    },
  ];

  let prismaSuccess = false;

  // Try seeding via Prisma ORM
  try {
    for (const userData of seedUsers) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: userData,
        create: userData,
      });
      console.log(`  ✓ [Prisma] Seeded user: ${user.name} (${user.username}) - ${user.position || 'No position'}`);
    }
    prismaSuccess = true;
  } catch (err: any) {
    console.warn('⚠️ Prisma direct seed failed or database port is restricted. Falling back to Supabase REST API...');
    console.warn(`  Reason: ${err.message || err}`);
  }

  // Fallback to Supabase REST API (Single atomic bulk upsert)
  if (!prismaSuccess && supabaseUrl && supabaseKey) {
    await new Promise((r) => setTimeout(r, 500));
    const bulkPayload = seedUsers.map((userData) => ({
      id: userData.id,
      name: userData.name,
      username: userData.username,
      email: userData.email,
      password: userData.password,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      status: userData.status,
      section: userData.section,
      position: userData.position,
      birthday: userData.birthday,
      address: userData.address,
      updatedAt: new Date().toISOString(),
    }));

    try {
      const { error: bulkErr } = await supabase
        .from('User')
        .upsert(bulkPayload, { onConflict: 'id' });

      if (bulkErr) {
        console.error('❌ Supabase bulk upsert error:', bulkErr.message);
      } else {
        bulkPayload.forEach((u) => {
          console.log(`  ✓ [Supabase REST] Upserted: ${u.name} (username: ${u.username}) - ${u.position || 'No position'}`);
        });
      }
    } catch (err: any) {
      console.error('❌ Supabase REST seed error:', err.message || err);
    }
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
