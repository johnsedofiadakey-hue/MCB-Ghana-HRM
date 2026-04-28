import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Seeding database (idempotent mode)...');

  // PROXIES & HELPERS
  const hash = (pw: string) => bcrypt.hash(pw, 12);
  // 1. SYSTEM ADMIN (DEV MASTER)
  console.log('👤 Synchronizing System Developer (DEV)...');
  const devPasswordHash = await hash('unlockme');
  await prisma.user.upsert({
    where: { email: 'dev@nexus.com' },
    update: {
       passwordHash: devPasswordHash,
       rank: 100
    },
    create: {
      fullName: 'MCB System Architect',
      email: 'dev@nexus.com',
      passwordHash: devPasswordHash,
      jobTitle: 'Core Systems Architect',
      role: 'DEV',
      status: 'ACTIVE',
      employeeCode: 'SYS-DEV-001',
      organizationId: null,
      rank: 100
    },
  });

  // 2. ORGANIZATION & BRANDING
  console.log('🏢 Synchronizing MC Bauchemie Ghana Organization...');
  const org = await prisma.organization.upsert({
    where: { id: 'mcb-ghana-tenant' },
    update: {},
    create: {
      id: 'mcb-ghana-tenant',
      name: 'MC Bauchemie Ghana',
      email: 'hr@mc-bauchemie.com.gh',
      subscriptionPlan: 'ENTERPRISE',
      billingStatus: 'ACTIVE',
      primaryColor: '#e11d48', // MCB Crimson
      themePreset: 'premium-monolith',
    },
  });

  // 3. DEPARTMENTS
  console.log('📂 Synchronizing Departments...');
  const depts = [
    { name: 'Production & Manufacturing' },
    { name: 'Logistics & Supply Chain' },
    { name: 'Quality Control' },
    { name: 'Sales & Marketing' },
    { name: 'HR & Administration' },
  ];

  const deptMap: Record<string, any> = {};
  for (const d of depts) {
    deptMap[d.name] = await prisma.department.upsert({
      where: { name_organizationId: { organizationId: org.id, name: d.name } },
      update: {},
      create: {
        organizationId: org.id,
        name: d.name,
      }
    });
  }

  // 4. MD ACCOUNT
  console.log('👤 Synchronizing Managing Director (MD)...');
  const mdPasswordHashFixed = await hash('unlockme');
  await prisma.user.upsert({
    where: { email: 'md@mcbauchemie.com' },
    update: {},
    create: {
      fullName: 'Regional Director',
      email: 'md@mcbauchemie.com',
      passwordHash: mdPasswordHashFixed,
      jobTitle: 'Managing Director',
      role: 'MD',
      employeeCode: 'MCB-MD-001',
      organizationId: org.id,
      departmentId: deptMap['HR & Administration'].id,
    },
  });

  // 5. SAMPLE EMPLOYEES
  console.log('👥 Synchronizing Sample Personnel...');
  const employees = [
    { name: 'Kwame Mensah', email: 'kwame.mensah@mc-bauchemie.com.gh', role: 'STAFF', title: 'Production Supervisor', dept: 'Production & Manufacturing' },
    { name: 'Ama Serwaa', email: 'ama.serwaa@mc-bauchemie.com.gh', role: 'MANAGER', title: 'Logistics Manager', dept: 'Logistics & Supply Chain' },
    { name: 'Kofi Arhin', email: 'kofi.arhin@mc-bauchemie.com.gh', role: 'STAFF', title: 'QC Analyst', dept: 'Quality Control' },
  ];

  for (const emp of employees) {
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        fullName: emp.name,
        email: emp.email,
        passwordHash: devPasswordHash, // Use dev password for all sample users
        jobTitle: emp.title,
        role: emp.role as any,
        status: 'ACTIVE',
        employeeCode: `MCB-${emp.dept}-${Math.floor(Math.random() * 900) + 100}`,
        organizationId: org.id,
        departmentId: deptMap[emp.dept].id,
      },
    });
  }

  // 6. OFFBOARDING TEMPLATES
  console.log('📋 Synchronizing Offboarding Templates...');
  const templates = [
    {
      name: 'Standard Employee Exit',
      description: 'Standard clearance process for administrative and general staff.',
      tasks: [
        { title: 'Revoke Email & VPN Access', category: 'IT', order: 1 },
        { title: 'Return Laptop & Official Equipment', category: 'IT', order: 2 },
        { title: 'Handover Portfolio & Files', category: 'Work', order: 3 },
        { title: 'Submit Final Expense Claims', category: 'Finance', order: 4 },
        { title: 'Finance Clearance (Loans/Owed)', category: 'Finance', order: 5 },
        { title: 'Exit Interview', category: 'HR', order: 6 },
        { title: 'Revoke Physical Access/ID Cards', category: 'Security', order: 7 },
      ]
    },
    {
      name: 'Managerial Exit Protocol',
      description: 'Advanced clearance for leadership and management positions.',
      tasks: [
        { title: 'Team Handover Meeting', category: 'Leadership', order: 1 },
        { title: 'Revoke Admin/Manager Access Groups', category: 'IT', order: 2 },
        { title: 'Return Company Vehicle (if applicable)', category: 'Logistics', order: 3 },
        { title: 'Final Performance Appraisals for Direct Reports', category: 'HR', order: 4 },
        { title: 'Handover Budgetary/Signatory Authority', category: 'Finance', order: 5 },
        { title: 'In-Depth Exit Review', category: 'HR', order: 6 },
      ]
    }
  ];

  for (const t of templates) {
    let template = await prisma.offboardingTemplate.findFirst({
      where: { organizationId: org.id, name: t.name }
    });

    if (!template) {
      template = await prisma.offboardingTemplate.create({
        data: {
          organizationId: org.id,
          name: t.name,
          description: t.description,
        }
      });
    }

    for (const task of t.tasks) {
      const existingTask = await prisma.offboardingTask.findFirst({
        where: { templateId: template.id, title: task.title }
      });

      if (!existingTask) {
        await prisma.offboardingTask.create({
          data: {
            organizationId: org.id,
            templateId: template.id,
            title: task.title,
            category: task.category,
            order: task.order,
          }
        });
      }
    }
  }

  console.log('\n✅ SEED COMPLETE! System ready.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
