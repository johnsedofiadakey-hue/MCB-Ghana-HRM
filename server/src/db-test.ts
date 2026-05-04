import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
  console.log('--- MCB DATABASE DIAGNOSTIC ---');
  try {
    const packetCount = await prisma.appraisalPacket.count();
    console.log(`Total AppraisalPackets: ${packetCount}`);

    const packets = await prisma.appraisalPacket.findMany({
      take: 5,
      include: { cycle: true, employee: true }
    });
    
    console.log('Sample Packets:', JSON.stringify(packets, null, 2));

  } catch (err: any) {
    console.error('CRITICAL DATABASE ERROR:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

run();
