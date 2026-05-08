import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOffboarding() {
  console.log('📄 Seeding offboarding templates...');
  
  const templates = [
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

  for (const t of templates) {
    const existing = await prisma.offboardingTemplate.findFirst({
      where: { name: t.name, organizationId: 'mcb-ghana-tenant' }
    });

    if (existing) {
      console.log(`  ⚠️ Template already exists: ${t.name}. Skipping...`);
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

  console.log('🎉 Offboarding seeding complete!');
}

seedOffboarding()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
