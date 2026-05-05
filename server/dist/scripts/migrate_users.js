"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Migrating all users to mcb-ghana-tenant...');
    const result = await prisma.user.updateMany({
        where: {
            OR: [
                { organizationId: 'mcb-ghana-tenant' },
                { organizationId: null }
            ]
        },
        data: {
            organizationId: 'mcb-ghana-tenant'
        }
    });
    console.log(`Successfully migrated ${result.count} users to mcb-ghana-tenant.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
