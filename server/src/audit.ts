import prisma from './prisma/client';

async function main() {
  console.log('--- RAW DB AUDIT ---');
  
  const depts = await prisma.$queryRaw`SELECT id, organizationId, name FROM Department`;
  console.log('Departments:', JSON.stringify(depts, null, 2));

  const settings = await prisma.$queryRaw`SELECT id, organizationId, companyName FROM SystemSettings`;
  console.log('SystemSettings:', JSON.stringify(settings, null, 2));

  const users = await prisma.$queryRaw`SELECT id, fullName, organizationId, role FROM User WHERE role = 'MD'`;
  console.log('MD Users:', JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
