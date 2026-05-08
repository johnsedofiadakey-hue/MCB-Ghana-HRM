import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
    const user = await prisma.user.findFirst({
        include: {
            appraisalPackets: { include: { cycle: true, reviews: true } },
            targetsAssignedToMe: { include: { metrics: true } }
        }
    });
    
    console.log('User found:', user?.fullName);
    console.log('Appraisal Packets count:', user?.appraisalPackets?.length);
    console.log('Targets count:', user?.targetsAssignedToMe?.length);
    
    if (user?.appraisalPackets && user.appraisalPackets.length > 0) {
        console.log('Sample Packet Cycle:', user.appraisalPackets[0].cycle.title);
    }
}

verify().catch(console.error);
