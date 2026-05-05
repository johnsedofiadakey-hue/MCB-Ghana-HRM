
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count({ where: { organizationId: 'mcb-ghana-tenant' } });
  const users = await prisma.user.findMany({ 
    where: { organizationId: 'mcb-ghana-tenant' },
    select: { fullName: true, role: true, email: true }
  });
  console.log('Total users in mcb-ghana-tenant:', count);
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
