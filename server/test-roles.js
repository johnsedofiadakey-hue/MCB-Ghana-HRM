const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getRoleRank } = require('./src/middleware/auth.middleware');

async function testRoles() {
    const itManagerRole = "IT MANAGER";
    const hrManagerRole = "HR MANAGER";
    
    console.log("IT MANAGER rank:", getRoleRank(itManagerRole));
    console.log("HR MANAGER rank:", getRoleRank(hrManagerRole));

    // Simulate lines 385+
    const actorRole = itManagerRole;
    const actorRank = getRoleRank(actorRole);
    const privilegedRoles = ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
    
    console.log("privilegedRoles.includes(actorRole):", privilegedRoles.includes(actorRole));
    console.log("actorRank < 70:", actorRank < 70);

    console.log("actorRank < 80:", actorRank < 80);
    console.log("actorRank < 85:", actorRank < 85);
}

testRoles().finally(() => prisma.$disconnect());
