import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const targetEmail = process.argv[2];

async function main() {
  if (!targetEmail) {
    console.error('Usage: npx ts-node src/scripts/promote_dev.ts <email>');
    process.exit(1);
  }

  console.log(`Attempting to promote ${targetEmail} to DEV role...`);

  const user = await prisma.user.findUnique({
    where: { email: targetEmail.toLowerCase().trim() }
  });

  if (!user) {
    console.error(`User with email ${targetEmail} not found.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { 
      role: 'DEV',
      organizationId: 'mcb-ghana-tenant' // Force them into the default tenant as well
    }
  });

  console.log(`Success! ${user.fullName} (${targetEmail}) is now a System Developer (L100).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
