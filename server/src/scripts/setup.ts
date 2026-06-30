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
import crypto from 'crypto';
import { sendEmail } from '../services/email.service';
import { PERMISSION_BUNDLES } from '../types/permissions';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const DEFAULT_ACCOUNTS = [
  { email: 'md@mcbauchemie.com', role: 'MD', fullName: 'Regional Director', jobTitle: 'Managing Director', rank: 95, bundle: 'MD_FINAL_APPROVER' },
  { email: 'director@mc-bauchemie.com.gh', role: 'DIRECTOR', fullName: 'Operations Director', jobTitle: 'Director of Operations', rank: 90, bundle: 'OPERATIONS_FACILITIES_ADMIN' },
  { email: 'hr@mc-bauchemie.com.gh', role: 'HR_DIRECTOR', fullName: 'Head of Human Resources', jobTitle: 'HR Director', rank: 92, bundle: 'HR_PEOPLE_ADMIN' },
  { email: 'it@mc-bauchemie.com.gh', role: 'IT_MANAGER', fullName: 'System IT Manager', jobTitle: 'IT Manager', rank: 85, bundle: 'IT_OPERATIONS_ADMIN' },
  { email: 'finance@mc-bauchemie.com.gh', role: 'FINANCE_MANAGER', fullName: 'Finance Manager', jobTitle: 'Finance Manager', rank: 87, bundle: 'FINANCE_PAYROLL_ADMIN' },
  { email: 'marketing@mc-bauchemie.com.gh', role: 'MARKETING_HEAD', fullName: 'Marketing Head', jobTitle: 'Marketing Head', rank: 86, bundle: 'MARKETING_CARD_ADMIN' },
];

const hashToken = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

async function setup() {
  console.log('\n🚀 MCB-HRM Ghana — Production Setup\n');

  // ── 1. Default Organization ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: 'mcb-ghana-tenant' },
    update: {},
    create: {
      id: 'mcb-ghana-tenant',
      name: 'MC Bauchemie Ghana',
      email: 'hr@mc-bauchemie.com.gh',
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
    where: { organizationId: 'mcb-ghana-tenant' },
    update: {},
    create: {
      organizationId: 'mcb-ghana-tenant',
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
  const invitationFailures: string[] = [];

  const bundles = new Map<string, any>();
  for (const [name, permissions] of Object.entries(PERMISSION_BUNDLES)) {
    const existing = await prisma.permissionBundle.findFirst({ where: { organizationId: org.id, name } });
    const bundle = existing
      ? await prisma.permissionBundle.update({ where: { id: existing.id }, data: { permissions: [...permissions], scope: 'ORG' } })
      : await prisma.permissionBundle.create({ data: { organizationId: org.id, name, permissions: [...permissions], scope: 'ORG' } });
    bundles.set(name, bundle);
  }
  console.log(`✅ ${bundles.size} permission bundles synchronized`);

  for (const acc of DEFAULT_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString('base64url'), SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        role: acc.role,
        rank: acc.rank,
        fullName: acc.fullName,
        jobTitle: acc.jobTitle,
        organizationId: org.id,
        permissionBundles: { set: [{ id: bundles.get(acc.bundle).id }] },
      },
      create: {
        email: acc.email,
        passwordHash,
        fullName: acc.fullName,
        role: acc.role,
        jobTitle: acc.jobTitle,
        status: 'ACTIVE',
        leaveBalance: 24,
        leaveAllowance: 24,
        organizationId: org.id,
        rank: acc.rank,
        loginEnabled: true,
        mustChangePassword: true,
        permissionBundles: { connect: [{ id: bundles.get(acc.bundle).id }] },
        joinDate: new Date(),
      },
    });

    createdUsers.push(user);
    console.log(`  ✅ ${acc.role.padEnd(18)} ${acc.email}`);

    if (!existing || user.mustChangePassword) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.passwordResetToken.create({
        data: { userId: user.id, token: hashToken(rawToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}`;
      const sent = await sendEmail({
        to: user.email,
        subject: 'Your MCB HRM account invitation',
        html: `<p>Hello ${user.fullName},</p><p>Your MCB HRM account is ready. Use the secure link below within 24 hours to choose your password.</p><p><a href="${inviteUrl}">Set my password</a></p>`,
      });
      if (!sent) invitationFailures.push(user.email);
    }
  }

  // ── 4. Set up reporting hierarchy ────────────────────────────────────────
  const md       = createdUsers.find(u => u.role === 'MD');
  const hr       = createdUsers.find(u => u.role === 'HR_DIRECTOR');
  const it       = createdUsers.find(u => u.role === 'IT_MANAGER');
  const finance  = createdUsers.find(u => u.role === 'FINANCE_MANAGER');
  const marketing = createdUsers.find(u => u.role === 'MARKETING_HEAD');
  const director = createdUsers.find(u => u.role === 'DIRECTOR');

  if (md && hr) await prisma.user.update({ where: { id: hr.id }, data: { supervisorId: md.id } });
  if (md && it) await prisma.user.update({ where: { id: it.id }, data: { supervisorId: md.id } });
  if (md && finance) await prisma.user.update({ where: { id: finance.id }, data: { supervisorId: md.id } });
  if (md && marketing) await prisma.user.update({ where: { id: marketing.id }, data: { supervisorId: md.id } });
  if (md && director) await prisma.user.update({ where: { id: director.id }, data: { supervisorId: md.id } });
  console.log('\n✅ Reporting hierarchy configured');

  // ── 5. Departments ───────────────────────────────────────────────────────
  const depts = [
    { name: 'Human Resources',   managerId: hr?.id, memberIds: [hr?.id] },
    { name: 'Technology',        managerId: it?.id, memberIds: [it?.id] },
    { name: 'Finance',           managerId: finance?.id, memberIds: [finance?.id] },
    { name: 'Operations',        managerId: director?.id, memberIds: [director?.id, md?.id] },
    { name: 'Sales & Marketing', managerId: marketing?.id, memberIds: [marketing?.id] },
  ];

  for (const dept of depts) {
    const d = await prisma.department.upsert({
      where: { name_organizationId: { name: dept.name, organizationId: 'mcb-ghana-tenant' } },
      update: { managerId: dept.managerId || null },
      create: { name: dept.name, organizationId: 'mcb-ghana-tenant', managerId: dept.managerId },
    });
    const memberIds = dept.memberIds.filter((id): id is string => Boolean(id));
    if (memberIds.length) {
      await prisma.user.updateMany({
        where: { id: { in: memberIds }, organizationId: org.id },
        data: { departmentId: d.id },
      });
    }
  }
  console.log(`✅ ${depts.length} departments created`);

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
        organizationId: 'mcb-ghana-tenant',
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

  // ── Default cross-department onboarding workflow ───────────────────────
  let onboardingTemplate = await prisma.onboardingTemplate.findFirst({ where: { organizationId: org.id, isDefault: true } });
  if (!onboardingTemplate) {
    onboardingTemplate = await prisma.onboardingTemplate.create({
      data: {
        organizationId: org.id,
        name: 'MCB Standard Employee Onboarding',
        description: 'HR preboarding with IT, Marketing and line-manager handoffs.',
        isDefault: true,
        tasks: {
          create: [
            { organizationId: org.id, title: 'Verify employee master data', category: 'HR', ownerRole: 'HR', dueAfterDays: 1, order: 0 },
            { organizationId: org.id, title: 'Provision company email and system account', category: 'IT', ownerRole: 'IT', autoCompleteEvent: 'ACCOUNT_PROVISIONED', dueAfterDays: 2, order: 1 },
            { organizationId: org.id, title: 'Assign required equipment', category: 'IT', ownerRole: 'IT', autoCompleteEvent: 'ASSET_ASSIGNED', dueAfterDays: 2, order: 2 },
            { organizationId: org.id, title: 'Configure physical access credential', category: 'IT', ownerRole: 'IT', autoCompleteEvent: 'CARD_ACCESS_ACTIVATED', dueAfterDays: 2, order: 3 },
            { organizationId: org.id, title: 'Prepare and issue employee ID card', category: 'MARKETING', ownerRole: 'MARKETING', autoCompleteEvent: 'ID_CARD_ISSUED', dueAfterDays: 3, order: 4 },
            { organizationId: org.id, title: 'Publish digital call card', category: 'MARKETING', ownerRole: 'MARKETING', autoCompleteEvent: 'CALL_CARD_PUBLISHED', dueAfterDays: 3, order: 5 },
            { organizationId: org.id, title: 'Complete departmental induction', category: 'MANAGER', ownerRole: 'MANAGER', dueAfterDays: 5, order: 6 },
            { organizationId: org.id, title: 'Acknowledge policies and employee handbook', category: 'EMPLOYEE', ownerRole: 'EMPLOYEE', dueAfterDays: 7, order: 7 },
          ],
        },
      },
    });
  }
  console.log(`✅ Default onboarding workflow: ${onboardingTemplate.name}`);

  const statutoryExisting = await prisma.payrollStatutoryRule.findFirst({
    where: { organizationId: org.id, name: 'Ghana statutory rules 2026' },
  });
  if (!statutoryExisting) {
    await prisma.payrollStatutoryRule.create({
      data: {
        organizationId: org.id,
        name: 'Ghana statutory rules 2026',
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        employeeSsnitRate: 0.055,
        employerSsnitRate: 0.13,
        minimumInsurable: 587.80,
        maximumInsurable: 69000,
        payeBands: [
          { limit: 490, rate: 0 }, { limit: 110, rate: 0.05 }, { limit: 130, rate: 0.10 },
          { limit: 3166.67, rate: 0.175 }, { limit: 16000, rate: 0.25 },
          { limit: 30520, rate: 0.30 }, { limit: 999999999, rate: 0.35 },
        ],
        bonusRules: { annualThresholdRate: 0.15, flatRate: 0.05 },
        overtimeRules: { mode: 'GRADUATED' },
        accountantApproved: false,
      },
    });
  }
  console.log('✅ 2026 statutory rule staged for accountant approval');

  // ── 8. Default Offboarding Templates ─────────────────────────────────────
  console.log('\n📄 Creating offboarding templates...');
  const offboardingTemplates = [
    {
      name: 'Standard Employee Exit',
      description: 'Standard clearance process for resigning or terminated employees.',
      tasks: [
        { title: 'Asset Return (Laptop, Keys, Access Card)', category: 'IT', isRequired: true },
        { title: 'Knowledge Transfer & Handover', category: 'Manager', isRequired: true },
        { title: 'Revoke Email & System Access', category: 'IT', isRequired: true },
        { title: 'Final Payroll Settlement', category: 'Finance', isRequired: true },
        { title: 'Recover employee ID and withdraw call card', category: 'Marketing', isRequired: true },
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
      where: { name: t.name, organizationId: 'mcb-ghana-tenant' }
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
          organizationId: 'mcb-ghana-tenant',
          name: t.name,
          description: t.description,
          tasks: {
            create: t.tasks.map((task, i) => ({
              ...task,
              organizationId: 'mcb-ghana-tenant',
              order: i
            }))
          }
        }
      });
      console.log(`  ✅ Template created: ${t.name}`);
    }
  }

  if (invitationFailures.length) {
    throw new Error(`Setup completed, but invitation email delivery failed for: ${invitationFailures.join(', ')}. Check Render SMTP settings and rerun setup to issue fresh links.`);
  }

  console.log('\n🎉 Setup complete. Secure invitations are active for accounts awaiting first login.\n');
}

setup()
  .catch(e => { console.error('❌ Setup failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
