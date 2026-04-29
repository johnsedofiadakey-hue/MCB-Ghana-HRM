
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function purgeAllAppraisals() {
  console.log('--- Appraisal Full Purge Started ---');
  
  const organizationId = 'mcb-ghana-tenant';
  
  try {
    const cycles = await (prisma as any).appraisalCycle.findMany({
      where: { organizationId }
    });
    
    console.log(`Found ${cycles.length} appraisal cycles to purge.`);
    
    if (cycles.length > 0) {
      const cycleIds = cycles.map((c: any) => c.id);
      
      await prisma.$transaction(async (tx) => {
        // 1. Find all Packets
        const packets = await (tx as any).appraisalPacket.findMany({
          where: { cycleId: { in: cycleIds } },
          select: { id: true }
        });
        const packetIds = packets.map((p: any) => p.id);
        
        if (packetIds.length > 0) {
          // 2. Delete Reviews
          const reviewsDeleted = await (tx as any).appraisalReview.deleteMany({
            where: { packetId: { in: packetIds } }
          });
          console.log(`Deleted ${reviewsDeleted.count} reviews.`);
          
          // 3. Delete Packets
          const packetsDeleted = await (tx as any).appraisalPacket.deleteMany({
            where: { id: { in: packetIds } }
          });
          console.log(`Deleted ${packetsDeleted.count} packets.`);
        }
        
        // 4. Delete Cycles
        const cyclesDeleted = await (tx as any).appraisalCycle.deleteMany({
          where: { id: { in: cycleIds } }
        });
        console.log(`Deleted ${cyclesDeleted.count} appraisal cycles.`);
      });
      
      console.log('--- Purge Complete ---');
    } else {
      console.log('No appraisal cycles found for this organization.');
    }
  } catch (error) {
    console.error('Purge failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

purgeAllAppraisals();
