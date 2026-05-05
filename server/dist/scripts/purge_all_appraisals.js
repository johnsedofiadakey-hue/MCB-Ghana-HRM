"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
async function purgeAllAppraisals() {
    console.log('--- Appraisal Full Purge Started ---');
    const organizationId = 'mcb-ghana-tenant';
    try {
        const cycles = await prisma.appraisalCycle.findMany({
            where: { organizationId }
        });
        console.log(`Found ${cycles.length} appraisal cycles to purge.`);
        if (cycles.length > 0) {
            const cycleIds = cycles.map((c) => c.id);
            await prisma.$transaction(async (tx) => {
                // 1. Find all Packets
                const packets = await tx.appraisalPacket.findMany({
                    where: { cycleId: { in: cycleIds } },
                    select: { id: true }
                });
                const packetIds = packets.map((p) => p.id);
                if (packetIds.length > 0) {
                    // 2. Delete Reviews
                    const reviewsDeleted = await tx.appraisalReview.deleteMany({
                        where: { packetId: { in: packetIds } }
                    });
                    console.log(`Deleted ${reviewsDeleted.count} reviews.`);
                    // 3. Delete Packets
                    const packetsDeleted = await tx.appraisalPacket.deleteMany({
                        where: { id: { in: packetIds } }
                    });
                    console.log(`Deleted ${packetsDeleted.count} packets.`);
                }
                // 4. Delete Cycles
                const cyclesDeleted = await tx.appraisalCycle.deleteMany({
                    where: { id: { in: cycleIds } }
                });
                console.log(`Deleted ${cyclesDeleted.count} appraisal cycles.`);
            });
            console.log('--- Purge Complete ---');
        }
        else {
            console.log('No appraisal cycles found for this organization.');
        }
    }
    catch (error) {
        console.error('Purge failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
purgeAllAppraisals();
