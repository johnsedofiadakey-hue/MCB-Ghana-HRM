"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const orgId = 'mcb-ghana-tenant';
    console.log(`Verifying persistence for ${orgId}...`);
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, themePreset: true, primaryColor: true }
    });
    console.log('Current settings:', JSON.stringify(org, null, 2));
    console.log('Simulating update...');
    await prisma.organization.update({
        where: { id: orgId },
        data: { themePreset: 'premium-monolith' }
    });
    const updated = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { themePreset: true }
    });
    if (updated?.themePreset === 'premium-monolith') {
        console.log('Persistence test: PASSED');
    }
    else {
        console.log('Persistence test: FAILED');
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
