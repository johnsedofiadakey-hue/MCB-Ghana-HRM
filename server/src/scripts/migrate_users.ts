import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating all users to default-tenant...');

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { organizationId: 'mcb-ghana-tenant' },
        { organizationId: null }
      ]
    },
    data: {
      organizationId: 'default-tenant'
    }
  });

  console.log(`Successfully migrated ${result.count} users to default-tenant.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
