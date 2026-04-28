
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting MCB-HRM Ghana Data Cleanup...');

  // 1. Update roles from MID_MANAGER to SUPERVISOR
  const roleUpdate = await prisma.user.updateMany({
    where: { role: 'MID_MANAGER' },
    data: { role: 'SUPERVISOR' }
  });
  console.log(`✅ Updated ${roleUpdate.count} users from MID_MANAGER to SUPERVISOR`);

  // 2. Rename 'common.global' department
  const deptUpdate = await prisma.department.updateMany({
    where: { name: 'common.global' },
    data: { name: 'Internal Support / HQ' }
  });
  console.log(`✅ Renamed ${deptUpdate.count} departments from 'common.global' to 'Internal Support / HQ'`);

  // 3. Update existing users who might be in 'common.global' if it was hardcoded or if department Obj is null
  // In the UI, we saw emp.departmentObj?.name || t('common.unassigned_dept')
  // If departmentObj is null, we are safe as long as t('common.unassigned_dept') is set.
  
  console.log('🎉 Data cleanup complete!');
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
