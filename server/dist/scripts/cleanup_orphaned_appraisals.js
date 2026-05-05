"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
async function cleanupOrphans() {
    console.log('--- Appraisal Orphan Cleanup Started ---');
    try {
        // 1. Find all AppraisalPackets whose cycleId no longer exists
        const packets = await prisma.appraisalPacket.findMany({
            include: { cycle: true }
        });
        const orphans = packets.filter((p) => !p.cycle);
        console.log(`Found ${orphans.length} orphaned appraisal packets.`);
        if (orphans.length > 0) {
            const orphanIds = orphans.map((o) => o.id);
            await prisma.$transaction(async (tx) => {
                // 2. Delete all reviews for these orphaned packets
                const reviewDelete = await tx.appraisalReview.deleteMany({
                    where: { packetId: { in: orphanIds } }
                });
                console.log(`Deleted ${reviewDelete.count} orphaned reviews.`);
                // 3. Delete the orphaned packets
                const packetDelete = await tx.appraisalPacket.deleteMany({
                    where: { id: { in: orphanIds } }
                });
                console.log(`Deleted ${packetDelete.count} orphaned packets.`);
            });
            console.log('Cleanup successful.');
        }
        else {
            console.log('No orphaned records found.');
        }
    }
    catch (error) {
        console.error('Cleanup failed:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
cleanupOrphans();
