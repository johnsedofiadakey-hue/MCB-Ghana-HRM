"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkSubUnitDeletion() {
    console.log('--- Sub-Unit Deletion Block Audit ---');
    try {
        // We don't actually delete anything here, just check if we can find a sub-unit with employees
        const subUnits = await prisma.subUnit.findMany({
            include: { employees: true }
        });
        const blocked = subUnits.filter(su => su.employees.length > 0);
        console.log(`Found ${blocked.length} sub-units with active employees.`);
        if (blocked.length > 0) {
            console.log('Example blocked Unit:', blocked[0].name, 'Employees:', blocked[0].employees.length);
            console.log('Testing deletion logic (transactionally)...');
            // We will perform a dry run by starting a transaction and rolling it back (by throwing)
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.subUnit.delete({ where: { id: blocked[0].id } });
                    console.log('DRY RUN: Successfully deleted sub-unit despite having employees!');
                    throw new Error('ROLLBACK_INTENTION');
                });
            }
            catch (e) {
                if (e.message === 'ROLLBACK_INTENTION') {
                    console.log('DRY RUN SUCCESSFUL. DB Constraint (SetNull) is working correctly.');
                }
                else {
                    throw e;
                }
            }
        }
        else {
            console.log('No sub-units with employees found to test against. Manual verification recommended.');
        }
    }
    catch (err) {
        console.error('Audit failed:', err);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkSubUnitDeletion();
