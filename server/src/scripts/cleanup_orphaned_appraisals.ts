import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function cleanupOrphans() {
  console.log('--- Appraisal Orphan Cleanup Started ---');
  
  try {
    // 1. Find all AppraisalPackets whose cycleId no longer exists
    const packets = await (prisma as any).appraisalPacket.findMany({
      include: { cycle: true }
    });

    const orphans = packets.filter((p: any) => !p.cycle);
    console.log(`Found ${orphans.length} orphaned appraisal packets.`);

    if (orphans.length > 0) {
      const orphanIds = orphans.map((o: any) => o.id);
      
      await prisma.$transaction(async (tx) => {
        // 2. Delete all reviews for these orphaned packets
        const reviewDelete = await (tx as any).appraisalReview.deleteMany({
          where: { packetId: { in: orphanIds } }
        });
        console.log(`Deleted ${reviewDelete.count} orphaned reviews.`);

        // 3. Delete the orphaned packets
        const packetDelete = await (tx as any).appraisalPacket.deleteMany({
          where: { id: { in: orphanIds } }
        });
        console.log(`Deleted ${packetDelete.count} orphaned packets.`);
      });
      
      console.log('Cleanup successful.');
    } else {
      console.log('No orphaned records found.');
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphans();
