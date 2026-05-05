"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const orgs = await prisma.organization.findMany({
        select: {
            id: true,
            name: true,
            subdomain: true,
            customDomain: true,
            themePreset: true
        }
    });
    console.log('Organizations in DB:');
    console.log(JSON.stringify(orgs, null, 2));
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
