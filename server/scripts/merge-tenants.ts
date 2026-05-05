
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const SOURCE_TENANT = 'default-tenant';
  const TARGET_TENANT = 'mcb-ghana-tenant';

  try {
    console.log(`Merging ${SOURCE_TENANT} into ${TARGET_TENANT}...`);

    // 1. Update all users in SOURCE_TENANT to TARGET_TENANT
    // We handle duplicates by checking emails first
    const sourceUsers = await prisma.user.findMany({ where: { organizationId: SOURCE_TENANT } });
    
    for (const user of sourceUsers) {
      const existingInTarget = await prisma.user.findFirst({
        where: { email: user.email, organizationId: TARGET_TENANT }
      });

      if (existingInTarget) {
        console.log(`User ${user.email} already exists in ${TARGET_TENANT}. Deleting source record...`);
        await prisma.user.delete({ where: { id: user.id } });
      } else {
        console.log(`Moving user ${user.email} to ${TARGET_TENANT}...`);
        await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: TARGET_TENANT }
        });
      }
    }

    // 2. Update other entities if any (Departments, Assets, etc.)
    await prisma.department.updateMany({
      where: { organizationId: SOURCE_TENANT },
      data: { organizationId: TARGET_TENANT }
    });

    console.log('Merge complete.');
  } catch (error) {
    console.error('Merge failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
