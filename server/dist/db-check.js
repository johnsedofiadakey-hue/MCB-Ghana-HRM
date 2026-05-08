"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('--- DB Check ---');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    const users = await prisma.user.findMany({ select: { email: true, organizationId: true } });
    console.log('Users:', users);
    const depts = await prisma.department.findMany();
    console.log('Departments:', depts);
    const kpiSheets = await prisma.kpiSheet.findMany({ take: 5 });
    console.log('KPI Sheets count:', kpiSheets.length);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
