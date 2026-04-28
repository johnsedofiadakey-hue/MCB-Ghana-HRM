import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding MCB-HRM Ghana (Master Edition)...');

  const orgId = 'default-tenant';
  const commonPass = await bcrypt.hash('unlockme', 12);

  // 1. System Developer (You)
  console.log('👤 Provisioning Master Developer...');
  await prisma.user.upsert({
    where: { email: 'johnsedofiadakey@gmail.com' },
    update: {},
    create: {
      fullName: 'John Sedofiadakey',
      email: 'johnsedofiadakey@gmail.com',
      passwordHash: commonPass,
      role: 'DEV',
      status: 'ACTIVE',
      jobTitle: 'System Architect',
      organizationId: null, // Global System Admin
    },
  });

  // 2. Organization Branding
  console.log('🏢 Provisioning Default Organization...');
  await prisma.organization.upsert({
    where: { id: orgId },
    update: {},
    create: {
      id: orgId,
      name: 'MCB-HRM Ghana Corporation',
      email: 'contact@nexus-platform.com',
      billingStatus: 'ACTIVE',
      subscriptionPlan: 'PRO',
      primaryColor: '#6366f1',
      themePreset: 'premium-monolith',
      isAiEnabled: true
    }
  });

  // 3. Managing Director (MD / Admin)
  console.log('👤 Provisioning MD Account...');
  const md = await prisma.user.upsert({
    where: { email: 'md@nexus.com' },
    update: {},
    create: {
      fullName: 'Chief Operations Officer',
      email: 'md@nexus.com',
      passwordHash: commonPass,
      role: 'MD',
      status: 'ACTIVE',
      jobTitle: 'MD',
      organizationId: orgId,
    },
  });

  // 4. Operational Data (Departments)
  console.log('📂 Provisioning Departments...');
  const techDept = await prisma.department.upsert({
    where: { name_organizationId: { name: 'Technology', organizationId: orgId } },
    update: {},
    create: { name: 'Technology', organizationId: orgId, managerId: md.id }
  });

  console.log('✅ Seeding complete. Site is live and ready for login.');
}

seed()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
