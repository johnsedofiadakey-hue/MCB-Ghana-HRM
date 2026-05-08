import prisma from '../src/prisma/client';
import bcrypt from 'bcryptjs';

async function seedMCBGhana() {
  console.log('Seeding MC-Bauchemie Ghana...');

  // 1. Organisation record
  await prisma.organization.upsert({
    where: { id: 'default-tenant' },
    update: {},
    create: {
      id:             'default-tenant',
      name:           'MC-Bauchemie Ghana',
      city:           'Accra',
      country:        'GH',
      currency:       'GHS',
      language:       'en',
      subtitle:       'HR Management System',
      primaryColor:   '#009EE3',
      accentColor:    '#EE7100',
      secondaryColor: '#1A3C6B',
      sidebarBg:      '#0A1628',
      sidebarText:    '#FFFFFF',
      sidebarActive:  '#009EE3',
      subdomain:      'mcb-hrm-ghana',
      isEnterprise:   true,
      isAiEnabled:    true,
      subscriptionPlan: 'ENTERPRISE',
      billingStatus:    'ACTIVE',
      defaultLeaveAllowance: 21,
    }
  });

  // 2. System settings
  await prisma.systemSettings.upsert({
    where: { organizationId: 'default-tenant' },
    update: {},
    create: {
      organizationId: 'default-tenant',
      currency:       'GHS',
      trialDays:      0,
      loginNotice:    'Welcome to MC-Bauchemie Ghana HR Portal',
      loginSubtitle:  'Powered by Nexus HRM',
    }
  });

  // 3. MD admin account
  const existing = await prisma.user.findUnique({ where: { email: 'md@mcbauchemie.com' } });
  if (!existing) {
    const hash = await bcrypt.hash('unlockme', 12);
    await prisma.user.create({ data: {
      email:          'md@mcbauchemie.com',
      passwordHash:   hash,
      fullName:       'Managing Director',
      role:           'MD',
      jobTitle:       'Managing Director',
      organizationId: 'default-tenant',
      status:         'ACTIVE',
      currency:       'GHS',
      employeeCode:   'MCB-001',
      joinDate:       new Date(),
    }});
    console.log('MD account created: md@mcbauchemie.com / unlockme');
  }

  // 4. Ghana 2026 public holidays
  const holidays = [
    { name: "New Year's Day",       date: '2026-01-01' },
    { name: 'Constitution Day',       date: '2026-01-07' },
    { name: 'Independence Day',       date: '2026-03-06' },
    { name: 'Good Friday',            date: '2026-04-03' },
    { name: 'Easter Monday',          date: '2026-04-06' },
    { name: 'Eid ul-Fitr',            date: '2026-03-20' },
    { name: "May Day",               date: '2026-05-01' },
    { name: 'Eid ul-Adha',            date: '2026-05-27' },
    { name: "Founders Day",          date: '2026-08-04' },
    { name: 'Kwame Nkrumah Day',      date: '2026-09-21' },
    { name: "Farmers Day",           date: '2026-12-04' },
    { name: 'Christmas Day',          date: '2026-12-25' },
    { name: 'Boxing Day',             date: '2026-12-26' },
  ];

  for (const h of holidays) {
    const id = 'gh-2026-' + h.date;
    const exists = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!exists) await prisma.publicHoliday.create({ data: {
      id, name: h.name, date: new Date(h.date), country: 'GH',
      organizationId: 'default-tenant', isRecurring: true, year: 2026,
    }});
  }

  console.log('Seed complete. Login: md@mcbauchemie.com / unlockme');
}

seedMCBGhana().then(() => process.exit(0)).catch(e => {
  console.error(e); process.exit(1);
});
