const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.organization.count();
    console.log('ORGANIZATION_COUNT:', count);
    const orgs = await prisma.organization.findMany({ take: 5 });
    console.log('TENANTS:', JSON.stringify(orgs, null, 2));
  } catch (err) {
    console.error('DATABASE_ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
