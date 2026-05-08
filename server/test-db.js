const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUsers() {
    const itManager = await prisma.user.findFirst({
        where: { role: { in: ['IT MANAGER', 'IT_MANAGER'] } }
    });
    const staff = await prisma.user.findFirst({
        where: { role: 'STAFF' }
    });

    console.log("IT Manager ID:", itManager?.id, "Role:", itManager?.role);
    console.log("Staff ID:", staff?.id, "Role:", staff?.role);
}

findUsers().finally(() => prisma.$disconnect());
