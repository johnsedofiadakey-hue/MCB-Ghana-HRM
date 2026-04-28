/**
 * MCB-HRM Ghana — First-time Setup Script
 * Run this ONCE after deploying to production:
 *   npx ts-node src/scripts/setup.ts
 * Or via npm:
 *   npm run setup
 *
 * Creates the default organization and all role accounts.
 * Safe to run multiple times — uses upsert everywhere.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const DEFAULT_ACCOUNTS = [
  { email: 'johnsedofiadakey@gmail.com', password: 'unlockme',      role: 'DEV',         fullName: 'John Sedofiadakey',   jobTitle: 'System Architect' },
  { email: 'md@mcbauchemie.com', password: 'unlockme',      role: 'MD',          fullName: 'Regional Director',  jobTitle: 'Managing Director' },
  { email: 'director@mc-bauchemie.com.gh', password: 'Director@MCB2026!', role: 'DIRECTOR', fullName: 'Operations Director', jobTitle: 'Director of Operations' },
  { email: 'hr@mc-bauchemie.com.gh', password: 'HR@MCB2026!',      role: 'HR_OFFICER',  fullName: 'Head of Human Resources', jobTitle: 'HR Manager' },
  { email: 'it@mc-bauchemie.com.gh', password: 'IT@MCB2026!',      role: 'IT_MANAGER',  fullName: 'System IT Manager',      jobTitle: 'IT Manager' },
];

async function setup() {
  console.log('\n🚀 MCB-HRM Ghana — Production Setup\n');

  // ── 1. Default Organization ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id: 'default-tenant',
      name: 'MC Bauchemie Ghana',
      email: 'admin@nexus.com',
      currency: 'GHS',
      subscriptionPlan: 'PRO',
      billingStatus: 'ACTIVE',
      primaryColor: '#4F46E5',
      trialStartDate: new Date(),
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ── 2. System Settings ───────────────────────────────────────────────────
  await prisma.systemSettings.upsert({
    where: { organizationId: 'default-tenant' },
    update: {},
    create: {
      organizationId: 'default-tenant',
      isMaintenanceMode: false,
      securityLockdown: false,
      trialDays: 30,
      annualPrice: 3000,
      currency: 'GHS',
      domainExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      databaseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  });
  console.log('✅ System settings initialised');

  // ── 3. User Accounts ─────────────────────────────────────────────────────
  console.log('\n👥 Creating accounts...');
  const createdUsers: any[] = [];

  for (const acc of DEFAULT_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acc.password, SALT_ROUNDS);
    const orgId = acc.role === 'DEV' ? null : 'default-tenant';

    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {},
      create: {
        email: acc.email,
        passwordHash,
        fullName: acc.fullName,
        role: acc.role,
        jobTitle: acc.jobTitle,
        status: 'ACTIVE',
        leaveBalance: 24,
        leaveAllowance: 24,
        organizationId: orgId,
        joinDate: new Date(),
      },
    });

    createdUsers.push(user);
    console.log(`  ✅ ${acc.role.padEnd(12)} ${acc.email} (${acc.password})`);
  }

  // ── 4. Set up reporting hierarchy ────────────────────────────────────────
  const md       = createdUsers.find(u => u.role === 'MD');
  const hr       = createdUsers.find(u => u.role === 'HR_OFFICER');
  const it       = createdUsers.find(u => u.role === 'IT_MANAGER');
  const director = createdUsers.find(u => u.role === 'DIRECTOR');
  const manager  = createdUsers.find(u => u.role === 'MANAGER');
  const midMgr   = createdUsers.find(u => u.role === 'SUPERVISOR');
  const staff    = createdUsers.find(u => u.role === 'STAFF');
  const casual   = createdUsers.find(u => u.role === 'CASUAL');

  if (md && hr) await prisma.user.update({ where: { id: hr.id }, data: { supervisorId: md.id } });
  if (md && it) await prisma.user.update({ where: { id: it.id }, data: { supervisorId: md.id } });
  if (md && director) await prisma.user.update({ where: { id: director.id }, data: { supervisorId: md.id } });
  if (director && manager) await prisma.user.update({ where: { id: manager.id }, data: { supervisorId: director.id } });
  if (manager && midMgr) await prisma.user.update({ where: { id: midMgr.id }, data: { supervisorId: manager.id } });
  if (midMgr && staff) await prisma.user.update({ where: { id: staff.id }, data: { supervisorId: midMgr.id } });
  if (midMgr && casual) await prisma.user.update({ where: { id: casual.id }, data: { supervisorId: midMgr.id } });
  console.log('\n✅ Reporting hierarchy configured');

  // ── 5. Departments ───────────────────────────────────────────────────────
  const depts = [
    { name: 'Human Resources',   managerId: hr?.id || director?.id },
    { name: 'Technology',        managerId: manager?.id },
    { name: 'Finance',           managerId: director?.id },
    { name: 'Operations',        managerId: manager?.id },
    { name: 'Sales & Marketing', managerId: manager?.id },
  ];

  let firstDeptId: number | null = null;
  for (const dept of depts) {
    const d = await prisma.department.upsert({
      where: { name_organizationId: { name: dept.name, organizationId: 'default-tenant' } },
      update: {},
      create: { name: dept.name, organizationId: 'default-tenant', managerId: dept.managerId },
    });
    if (!firstDeptId) firstDeptId = d.id;
  }
  console.log(`✅ ${depts.length} departments created`);

  // ── 6. Assign staff to first department ──────────────────────────────────
  if (firstDeptId && staff) {
    await prisma.user.update({ where: { id: staff.id }, data: { departmentId: firstDeptId } });
  }
  if (firstDeptId && casual) {
    await prisma.user.update({ where: { id: casual.id }, data: { departmentId: firstDeptId } });
  }

  // ── 7. Ghana Public Holidays 2026 ───────────────────────────────────────
  const holidays2026 = [
    { name: "New Year's Day", date: new Date('2026-01-01') },
    { name: "Constitution Day", date: new Date('2026-01-07') },
    { name: "Independence Day", date: new Date('2026-03-06') },
    { name: "Good Friday", date: new Date('2026-04-03') },
    { name: "Easter Monday", date: new Date('2026-04-06') },
    { name: "May Day", date: new Date('2026-05-01') },
    { name: "Founders' Day", date: new Date('2026-08-04') },
    { name: "Kwame Nkrumah Memorial Day", date: new Date('2026-09-21') },
    { name: "Farmer's Day", date: new Date('2026-12-04') },
    { name: "Christmas Day", date: new Date('2026-12-25') },
    { name: "Boxing Day", date: new Date('2026-12-26') },
  ];

  for (const h of holidays2026) {
    const holidayId = `gh-2026-${h.date.getMonth() + 1}-${h.date.getDate()}`;
    await (prisma as any).publicHoliday.upsert({
      where: { id: holidayId },
      update: {},
      create: {
        id: holidayId,
        organizationId: 'default-tenant',
        name: h.name,
        date: h.date,
        country: 'GH',
        year: 2026,
        isRecurring: false,
      },
    }).catch(() => {
      // ignore duplicate if already exists
    });
  }
  console.log('✅ Ghana national holidays 2026 seeded');

  // ── 8. Sample Target for demonstration ───────────────────────────────────
  if (md && staff) {
    await prisma.target.upsert({
      where: { id: 'demo-target-001' },
      update: {},
      create: {
        id: 'demo-target-001',
        organizationId: 'default-tenant',
        title: 'Q2 2026 Performance Goal — Sample',
        description: 'Demonstrate how individual targets work. Update your progress and submit for review.',
        level: 'INDIVIDUAL',
        type: 'SINGLE',
        status: 'ASSIGNED',
        dueDate: new Date('2026-06-30'),
        assigneeId: staff.id,
        originatorId: md.id,
        lineManagerId: midMgr?.id || md.id,
        reviewerId: manager?.id || md.id,
        weight: 1.0,
        metrics: {
          create: [
            { organizationId: 'default-tenant', title: 'Tasks Completed', metricType: 'NUMERICAL', targetValue: 50, unit: 'tasks', weight: 0.5 },
            { organizationId: 'default-tenant', title: 'Customer Satisfaction', metricType: 'PERCENTAGE', targetValue: 90, unit: '%', weight: 0.5 },
          ],
        },
      },
    }).catch(() => {});
  }
  console.log('✅ Sample target created');

  // ── 9. Default Offboarding Templates ─────────────────────────────────────
  console.log('\n📄 Creating offboarding templates...');
  const offboardingTemplates = [
    {
      name: 'Standard Employee Exit',
      description: 'Standard clearance process for resigning or terminated employees.',
      tasks: [
        { title: 'Asset Return (Laptop, Keys, Access Card)', category: 'IT', isRequired: true },
        { title: 'Knowledge Transfer & Handover', category: 'Manager', isRequired: true },
        { title: 'Revoke Email & System Access', category: 'IT', isRequired: true },
        { title: 'Final Payroll Settlement', category: 'HR', isRequired: true },
        { title: 'Exit Interview', category: 'HR', isRequired: false }
      ]
    },
    {
      name: 'Retirement Clearance',
      description: 'Special clearance process for retiring employees including pension setup.',
      tasks: [
        { title: 'Asset Return (Laptop, Keys, Access Card)', category: 'IT', isRequired: true },
        { title: 'Pension & Benefits Briefing', category: 'HR', isRequired: true },
        { title: 'Knowledge Transfer & Leadership Handover', category: 'Manager', isRequired: true },
        { title: 'Final Gratitude Presentation', category: 'Manager', isRequired: false },
        { title: 'Final Payroll & Severance', category: 'HR', isRequired: true }
      ]
    }
  ];

  for (const t of offboardingTemplates) {
    const existing = await prisma.offboardingTemplate.findFirst({
      where: { name: t.name, organizationId: 'default-tenant' }
    });

    if (existing) {
      await prisma.offboardingTemplate.update({
        where: { id: existing.id },
        data: { description: t.description }
      });
      console.log(`  ✅ Template updated: ${t.name}`);
    } else {
      await prisma.offboardingTemplate.create({
        data: {
          organizationId: 'default-tenant',
          name: t.name,
          description: t.description,
          tasks: {
            create: t.tasks.map((task, i) => ({
              ...task,
              organizationId: 'default-tenant',
              order: i
            }))
          }
        }
      });
      console.log(`  ✅ Template created: ${t.name}`);
    }
  }

  console.log('\n🎉 Setup complete! You can now log in with any of the accounts above.');
  console.log('   Change passwords immediately after first login.\n');
}

setup()
  .catch(e => { console.error('❌ Setup failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
