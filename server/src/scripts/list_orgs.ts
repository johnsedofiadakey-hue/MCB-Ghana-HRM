import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      subdomain: true,
      customDomain: true,
      themePreset: true
    }
  });
  console.log('Organizations in DB:');
  console.log(JSON.stringify(orgs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
