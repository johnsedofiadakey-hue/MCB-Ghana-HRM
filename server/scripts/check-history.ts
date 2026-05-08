
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const history = await prisma.employeeHistory.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: { select: { fullName: true } },
      createdBy: { select: { fullName: true } },
      loggedBy: { select: { fullName: true } }
    }
  });
  console.log(JSON.stringify(history, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
