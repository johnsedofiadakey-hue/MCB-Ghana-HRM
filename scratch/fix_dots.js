const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDots() {
    console.log('🔍 Searching for users with dots in names...');
    const users = await prisma.user.findMany({
        where: {
            fullName: { contains: '.' }
        }
    });

    console.log(`Found ${users.length} users with dots in their names.`);

    for (const u of users) {
        const newName = u.fullName.replace(/\./g, ' ');
        console.log(`Updating: "${u.fullName}" -> "${newName}"`);
        await prisma.user.update({
            where: { id: u.id },
            data: { fullName: newName }
        });
    }

    console.log('✅ Done.');
}

fixDots()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
