import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'dev@nexus.com';
  const password = 'unlockme';
  const fullName = 'System Developer';

  console.log(`Creating dev account: ${email}...`);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'DEV',
      organizationId: 'mcb-ghana-tenant',
      status: 'ACTIVE'
    },
    create: {
      email,
      fullName,
      passwordHash,
      role: 'DEV',
      organizationId: 'mcb-ghana-tenant',
      status: 'ACTIVE',
      jobTitle: 'Lead Developer'
    }
  });

  console.log(`Success! Dev account ${email} is ready with password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
