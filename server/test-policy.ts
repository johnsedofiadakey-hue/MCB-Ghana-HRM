import { PolicyService } from './src/services/policy.service';
import prisma from './src/prisma/client';

async function test() {
  console.log('🧪 Testing Policy Service...');
  
  const hrUser = await prisma.user.findFirst({ where: { email: 'hr@mcb.com' } });
  const staffUser = await prisma.user.findFirst({ where: { email: 'staff@mcb.com' } });

  if (!hrUser || !staffUser) {
    console.log('❌ Test users not found. Run seed first.');
    return;
  }

  console.log(`\n👤 Testing for HR User: ${hrUser.fullName} (${hrUser.id})`);
  const hrResult = await PolicyService.evaluatePolicy(hrUser.id, 'leave.approve');
  console.log('Result for leave.approve:', hrResult);

  const hrResult2 = await PolicyService.evaluatePolicy(hrUser.id, 'payroll.view');
  console.log('Result for payroll.view:', hrResult2);

  console.log(`\n👤 Testing for Staff User: ${staffUser.fullName} (${staffUser.id})`);
  const staffResult = await PolicyService.evaluatePolicy(staffUser.id, 'leave.approve');
  console.log('Result for leave.approve:', staffResult);

  const staffResult2 = await PolicyService.evaluatePolicy(staffUser.id, 'leave.apply', { targetUserId: staffUser.id });
  console.log('Result for leave.apply (self):', staffResult2);
}

test().finally(() => prisma.$disconnect());
