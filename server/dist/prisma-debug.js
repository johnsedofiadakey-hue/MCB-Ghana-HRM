"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    console.log('Models found:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
    // Check LeaveRequest fields
    try {
        const lr = await prisma.leaveRequest.findFirst();
        console.log('LeaveRequest fields:', lr ? Object.keys(lr) : 'No records found');
    }
    catch (e) {
        console.log('Error accessing leaveRequest:', e.message);
    }
    process.exit(0);
}
main();
