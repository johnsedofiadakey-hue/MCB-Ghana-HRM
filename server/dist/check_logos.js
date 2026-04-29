"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const orgs = await prisma.organization.findMany({
        select: { id: true, name: true, logoUrl: true }
    });
    console.log(JSON.stringify(orgs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
