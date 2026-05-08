import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  console.log('Models found:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));
  
  // Check LeaveRequest fields
  try {
    const lr = await (prisma as any).leaveRequest.findFirst();
    console.log('LeaveRequest fields:', lr ? Object.keys(lr) : 'No records found');
  } catch (e: any) {
    console.log('Error accessing leaveRequest:', e.message);
  }
  
  process.exit(0);
}

main();
