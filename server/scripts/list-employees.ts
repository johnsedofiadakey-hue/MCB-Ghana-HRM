
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const employees = await prisma.user.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        rank: true,
        employeeCode: true,
        status: true,
        jobTitle: true,
        departmentId: true,
        joinDate: true,
        salary: true,
        currency: true,
        createdAt: true
      },
      orderBy: { fullName: 'asc' }
    });
    console.log(JSON.stringify(employees, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
