import prisma from '../prisma/client';

async function main() {
  console.log('🔄 Seeding test data for staff@mcb.com direct DB access...');

  // 1. Get staff user
  const staff = await prisma.user.findFirst({
    where: { email: 'staff@mcb.com' }
  });

  if (!staff) {
    console.error('❌ staff@mcb.com user not found in the database!');
    return;
  }
  console.log(`👤 Found staff user: ${staff.fullName} (ID: ${staff.id})`);

  // 2. Clear existing cards for staff and create a fresh ACTIVE card
  console.log('🧹 Cleaning old cards for staff...');
  await prisma.card.deleteMany({
    where: { userId: staff.id }
  });

  console.log('💳 Creating fresh active card for staff...');
  const card = await prisma.card.create({
    data: {
      organizationId: staff.organizationId || 'mcb-ghana-tenant',
      userId: staff.id,
      cardNumber: 'MCB-GH-887766',
      status: 'ACTIVE'
    }
  });
  console.log('✅ Active card created:', card);

  // 3. Clear existing leaves for staff and create a fresh APPROVED leave spanning today
  console.log('🧹 Cleaning old leaves for staff...');
  await prisma.leaveRequest.deleteMany({
    where: { employeeId: staff.id }
  });

  console.log('📅 Creating fresh approved leave request spanning today...');
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 2);
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 2);

  const leave = await prisma.leaveRequest.create({
    data: {
      organizationId: staff.organizationId || 'mcb-ghana-tenant',
      employeeId: staff.id,
      startDate,
      endDate,
      leaveDays: 5,
      leaveType: 'ANNUAL',
      reason: 'Mandatory medical checkup and rest',
      status: 'APPROVED'
    }
  });
  console.log('✅ Approved leave spanning today created:', leave);

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed with error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
