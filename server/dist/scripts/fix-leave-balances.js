"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * fix-leave-balances.ts
 * Updates all active users with 0 leaveBalance to 24.
 * Run via: npx ts-node src/scripts/fix-leave-balances.ts
 */
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔍 Checking for users with 0 leave balance...');
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { leaveBalance: 0 },
                { leaveBalance: null },
            ],
            isArchived: false,
        }
    });
    console.log(`Found ${users.length} users to update.`);
    if (users.length === 0) {
        console.log('✅ No users need fixing.');
        return;
    }
    const result = await prisma.user.updateMany({
        where: {
            id: { in: users.map(u => u.id) }
        },
        data: {
            leaveBalance: null,
            leaveAllowance: null
        }
    });
    console.log(`✅ Successfully updated ${result.count} users.`);
}
main()
    .catch(e => {
    console.error('❌ Error fixing leave balances:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
