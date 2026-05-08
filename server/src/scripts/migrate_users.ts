import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating all users to mcb-ghana-tenant...');

  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { organizationId: 'mcb-ghana-tenant' },
        { organizationId: null }
      ]
    },
    data: {
      organizationId: 'mcb-ghana-tenant'
    }
  });

  console.log(`Successfully migrated ${result.count} users to mcb-ghana-tenant.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
