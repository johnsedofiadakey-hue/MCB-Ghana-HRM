import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDots() {
    const users = await prisma.user.findMany({
        where: {
            fullName: { contains: '.' }
        }
    });

    console.log(`Found ${users.length} users with dots in their names:`);
    users.forEach(u => console.log(` - ${u.fullName} (${u.email})`));

    // Optional: Fix them
    for (const u of users) {
        const newName = u.fullName.replace(/\./g, ' ');
        console.log(`Updating ${u.fullName} -> ${newName}`);
        await prisma.user.update({
            where: { id: u.id },
            data: { fullName: newName }
        });
    }
}

checkDots()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
