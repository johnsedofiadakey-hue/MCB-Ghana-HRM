import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ORG_ID = 'mcb-ghana-tenant';

const TEMPLATES = [
  {
    name: 'General Staff Onboarding',
    description: 'Standard onboarding for all new employees',
    isDefault: true,
    tasks: [
      { title: 'Welcome & Orientation', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 1, description: 'Welcome meeting with HR, introduce company values, culture, and structure.' },
      { title: 'Employment Contract Signing', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 2, description: 'Sign employment contract, NDA, and policy acknowledgements.' },
      { title: 'Payroll & Benefits Registration', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 2, order: 3, description: 'Register bank account details, SSNIT number, and select benefits.' },
      { title: 'System Account Setup', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 4, description: 'Create company email, HRM portal login, and grant role-based access.' },
      { title: 'ID Card & Access Card Issuance', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 3, order: 5, description: 'Print and issue employee photo ID card and building access card.' },
      { title: 'Workstation & Equipment Setup', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 2, order: 6, description: 'Assign laptop/desktop, configure peripherals, install required software.' },
      { title: 'Department Introduction', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 2, order: 7, description: 'Line manager introduces the new employee to the team and explains department workflow.' },
      { title: 'Role & Responsibilities Briefing', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 3, order: 8, description: 'Manager walks through KPIs, reporting structure, and 30/60/90 day expectations.' },
      { title: 'Health & Safety Training', category: 'Admin', ownerRole: 'HR_OFFICER', dueAfterDays: 5, order: 9, description: 'Complete mandatory health & safety briefing and acknowledge fire evacuation procedures.' },
      { title: 'Probation Check-in (30 Days)', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 30, order: 10, description: 'First probation review — confirm settling in, address any concerns.' },
    ],
  },
  {
    name: 'IT Staff Onboarding',
    description: 'Technical onboarding for IT team members',
    isDefault: false,
    tasks: [
      { title: 'Welcome & Security Briefing', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 1, description: 'Security policies, data handling protocols, and acceptable use policy signing.' },
      { title: 'System & Network Access', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 2, description: 'Set up VPN, internal network credentials, server access levels, and admin tools.' },
      { title: 'Development Environment Setup', category: 'IT', ownerRole: 'IT_ADMIN', dueAfterDays: 2, order: 3, description: 'Clone repos, configure IDE, install dev tools, set up local environment.' },
      { title: 'HR Portal Account & ID Card', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 4, description: 'Provision HRM login and issue photo ID and access card.' },
      { title: 'Employment Contract & NDA', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 5, description: 'Sign employment contract and confidentiality agreement.' },
      { title: 'Payroll Registration', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 2, order: 6, description: 'Register bank details and SSNIT number with Finance.' },
      { title: 'Codebase & Systems Walkthrough', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 3, order: 7, description: 'Senior team member walks through architecture, systems, and ongoing projects.' },
      { title: 'IT Role & Responsibilities', category: 'Manager', ownerRole: 'IT_MANAGER', dueAfterDays: 3, order: 8, description: 'Define scope, escalation paths, SLA expectations, and on-call schedule.' },
      { title: '30-Day Technical Review', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 30, order: 9, description: 'Review technical progress and assign first independent project.' },
    ],
  },
  {
    name: 'Management & Senior Staff Onboarding',
    description: 'Onboarding for managers, directors, and senior leadership',
    isDefault: false,
    tasks: [
      { title: 'Executive Welcome Meeting', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 1, description: 'Meet MD and senior leadership. Discuss strategic objectives and organizational structure.' },
      { title: 'Employment & Confidentiality Documents', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 2, description: 'Sign employment contract, NDA, and board/senior management conduct policy.' },
      { title: 'Compensation & Benefits Briefing', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 2, order: 3, description: 'Review compensation structure, allowances, pension, vehicle, and executive benefits.' },
      { title: 'System Access & Executive Tools', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 4, description: 'HRM admin access, reporting dashboards, email, and executive device setup.' },
      { title: 'ID Card & Access Credentials', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 2, order: 5, description: 'Issue executive ID card and full building access credentials.' },
      { title: 'Department Handover Briefing', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 3, order: 6, description: 'Full briefing on department P&L, team structure, current projects, and open issues.' },
      { title: 'Stakeholder Introductions', category: 'Admin', ownerRole: 'HR_DIRECTOR', dueAfterDays: 5, order: 7, description: 'Introduce to key internal and external stakeholders, clients, and partners.' },
      { title: 'Strategic Goals Alignment', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 7, order: 8, description: 'Align on 90-day plan, OKRs, and board reporting expectations.' },
      { title: '60-Day Leadership Review', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 60, order: 9, description: 'Assess integration, early wins, and leadership effectiveness review.' },
    ],
  },
];

async function seed() {
  console.log('Seeding onboarding templates...');

  const existing = await prisma.onboardingTemplate.findMany({ where: { organizationId: ORG_ID } });
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing templates — skipping seed.`);
    console.log(existing.map(t => `  - ${t.name}`).join('\n'));
    await prisma.$disconnect();
    return;
  }

  for (const tmpl of TEMPLATES) {
    const created = await prisma.onboardingTemplate.create({
      data: {
        organizationId: ORG_ID,
        name: tmpl.name,
        description: tmpl.description,
        isDefault: tmpl.isDefault,
        tasks: {
          create: tmpl.tasks.map(task => ({
            organizationId: ORG_ID,
            title: task.title,
            description: task.description,
            category: task.category,
            ownerRole: task.ownerRole,
            dueAfterDays: task.dueAfterDays,
            isRequired: true,
            order: task.order,
          })),
        },
      },
    });
    console.log(`✓ Created: "${created.name}" (${tmpl.tasks.length} tasks)`);
  }

  console.log('\nDone. Onboarding templates are ready.');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
