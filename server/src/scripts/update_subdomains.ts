import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating subdomains for tenant resolution...');
  
  const results = await Promise.all([
    prisma.organization.update({
      where: { id: 'mcb-ghana-tenant' },
      data: { subdomain: 'mcb-hrm-ghana' }
    }),
    prisma.organization.update({
      where: { id: 'mcb-ghana-tenant' },
      data: { subdomain: 'mcb-ghana' }
    })
  ]);

  console.log('Update complete:');
  results.forEach(org => {
    console.log(` - ${org.name}: subdomain set to "${org.subdomain}"`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
