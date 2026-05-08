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
    { name: 'Finance & Accounts' },
    { name: 'IT & Infrastructure' },
    { name: 'Research & Development' },
    { name: 'Procurement & Sourcing' }
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
    update: {
      fullName: 'Eddie Murphey',
      rank: 95
    },
    create: {
      fullName: 'Eddie Murphey',
      email: 'md@mcbauchemie.com',
      passwordHash: mdPasswordHashFixed,
      jobTitle: 'Managing Director',
      role: 'MD',
      employeeCode: 'MCB-MD-001',
      organizationId: org.id,
      departmentId: deptMap['HR & Administration'].id,
      rank: 95
    },
  });

  // 5. SAMPLE EMPLOYEES
  console.log('👥 Synchronizing Sample Personnel...');
  const employees = [
    { name: 'HR Head', email: 'hr@mcb.com', role: 'HR_MANAGER', title: 'HR Manager', dept: 'HR & Administration', rank: 88 },
    { name: 'IT Head', email: 'it@mcb.com', role: 'IT_MANAGER', title: 'IT Manager', dept: 'IT & Infrastructure', rank: 85 },
    { name: 'Finance Head', email: 'finance@mcb.com', role: 'FINANCE_MANAGER', title: 'Finance Manager', dept: 'Finance & Accounts', rank: 87 },
    { name: 'Production Mgr', email: 'production@mcb.com', role: 'MANAGER', title: 'Production Manager', dept: 'Production & Manufacturing', rank: 75 },
    { name: 'Logistics Mgr', email: 'logistics@mcb.com', role: 'MANAGER', title: 'Logistics Manager', dept: 'Logistics & Supply Chain', rank: 75 },
    { name: 'IT Admin', email: 'itadmin@mcb.com', role: 'IT_ADMIN', title: 'IT Administrator', dept: 'IT & Infrastructure', rank: 80 },
    { name: 'QC Lead', email: 'qc@mcb.com', role: 'MANAGER', title: 'QC Manager', dept: 'Quality Control', rank: 75 },
    { name: 'Sales Head', email: 'sales@mcb.com', role: 'MANAGER', title: 'Sales Manager', dept: 'Sales & Marketing', rank: 75 },
    { name: 'Staff User', email: 'staff@mcb.com', role: 'STAFF', title: 'Junior Assistant', dept: 'HR & Administration', rank: 50 },
    { name: 'Accountant', email: 'accountant@mcb.com', role: 'STAFF', title: 'Staff Accountant', dept: 'Finance & Accounts', rank: 50 }
  ];

  for (const emp of employees) {
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        rank: emp.rank,
        role: emp.role as any
      },
      create: {
        fullName: emp.name,
        email: emp.email,
        passwordHash: mdPasswordHashFixed, // 'unlockme'
        jobTitle: emp.title,
        role: emp.role as any,
        status: 'ACTIVE',
        employeeCode: `MCB-${emp.dept.slice(0, 3).toUpperCase()}-${Math.floor(Math.random() * 900) + 100}`,
        organizationId: org.id,
        departmentId: deptMap[emp.dept].id,
        rank: emp.rank
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

<<<<<<< HEAD
  // 7. PERMISSION BUNDLES
  console.log('📦 Synchronizing Permission Bundles...');
  const bundles = [
    {
      name: 'Full Access Bundle',
      permissions: ['leave.approve', 'leave.view_all', 'payroll.view', 'performance.calibrate', 'kpi.manage'],
      scope: 'ORG'
    },
    {
      name: 'Manager Access Bundle',
      permissions: ['leave.approve', 'leave.view_dept', 'performance.review', 'kpi.update'],
      scope: 'DEPT'
    },
    {
      name: 'Staff Access Bundle',
      permissions: ['leave.apply', 'leave.view_self', 'kpi.view_self'],
      scope: 'SELF'
    }
  ];

  const bundleMap: Record<string, any> = {};
  for (const b of bundles) {
    bundleMap[b.name] = await (prisma as any).permissionBundle.upsert({
      where: { id: b.name },
      update: {},
      create: {
        id: b.name,
        organizationId: org.id,
        name: b.name,
        permissions: b.permissions,
        scope: b.scope
      }
    });
  }

  // Assign bundles to users
  console.log('🔗 Assigning Bundles to Users...');
  const hrUser = await prisma.user.findUnique({ where: { email: 'hr@mcb.com' } });
  const prodMgr = await prisma.user.findUnique({ where: { email: 'production@mcb.com' } });
  const staffUser = await prisma.user.findUnique({ where: { email: 'staff@mcb.com' } });

  if (hrUser) {
    await (prisma as any).user.update({
      where: { id: hrUser.id },
      data: { permissionBundles: { connect: { id: bundleMap['Full Access Bundle'].id } } }
    });
  }
  if (prodMgr) {
    await (prisma as any).user.update({
      where: { id: prodMgr.id },
      data: { permissionBundles: { connect: { id: bundleMap['Manager Access Bundle'].id } } }
    });
  }
  if (staffUser) {
    await (prisma as any).user.update({
      where: { id: staffUser.id },
      data: { permissionBundles: { connect: { id: bundleMap['Staff Access Bundle'].id } } }
    });
  }

  // 6. SEED CONTINUOUS PERFORMANCE & CARDS
  console.log('📊 Seeding Continuous Performance & Cards...');
  const staff = await prisma.user.findUnique({ where: { email: 'staff@mcb.com' } });
  const manager = await prisma.user.findUnique({ where: { email: 'production@mcb.com' } });

  if (staff && manager) {
    // Seed Check-In
    await prisma.checkIn.create({
      data: {
        organizationId: 'mcb-ghana-tenant',
        employeeId: staff.id,
        managerId: manager.id,
        scheduledAt: new Date(),
        notes: 'Initial check-in to discuss goals.',
        completedAt: new Date(),
      }
    });

    // Seed Feedback
    await prisma.feedback360.create({
      data: {
        organizationId: 'mcb-ghana-tenant',
        providerId: manager.id,
        receiverId: staff.id,
        content: 'Great work on the production line!',
        rating: 5,
      }
    });

    // Seed Card
    const card = await prisma.card.create({
      data: {
        organizationId: 'mcb-ghana-tenant',
        userId: staff.id,
        cardNumber: 'MCB-CARD-001',
        status: 'ACTIVE',
      }
    });

    await prisma.cardLifecycleEvent.create({
      data: {
        organizationId: 'mcb-ghana-tenant',
        cardId: card.id,
        state: 'ACTIVE',
        reason: 'Initial card issuance',
        performedById: manager.id,
      }
    });
  }

=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
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
