const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('--- Database Dot Audit ---');
  
  // Users
  const users = await prisma.user.findMany({ select: { id: true, fullName: true, email: true, role: true, jobTitle: true, departmentId: true } });
  const usersWithDots = users.filter(u => u.fullName && u.fullName.includes('.'));
  console.log(`Users with dots in fullName: ${usersWithDots.length}`);
  usersWithDots.forEach(u => console.log(`  - [${u.id}] ${u.fullName}`));

  // Organizations
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, subtitle: true } });
  const orgsWithDots = orgs.filter(o => (o.name && o.name.includes('.')) || (o.subtitle && o.subtitle.includes('.')));
  console.log(`Organizations with dots in name/subtitle: ${orgsWithDots.length}`);
  orgsWithDots.forEach(o => console.log(`  - [${o.id}] Name: ${o.name}, Subtitle: ${o.subtitle}`));

  // Departments
  const depts = await prisma.department.findMany({ select: { id: true, name: true } });
  const deptsWithDots = depts.filter(d => d.name && d.name.includes('.'));
  console.log(`Departments with dots in name: ${deptsWithDots.length}`);
  deptsWithDots.forEach(d => console.log(`  - [${d.id}] ${d.name}`));

  // Appraisal Cycles
  const cycles = await prisma.appraisalCycle.findMany({ select: { id: true, title: true } });
  const cyclesWithDots = cycles.filter(c => c.title && c.title.includes('.'));
  console.log(`Cycles with dots in title: ${cyclesWithDots.length}`);

  // Appraisal Packets (Final Verdicts)
  const packets = await prisma.appraisalPacket.findMany({ select: { id: true, finalVerdict: true } });
  const packetsWithDots = packets.filter(p => p.finalVerdict && p.finalVerdict.includes('.'));
  console.log(`Packets with dots in finalVerdict: ${packetsWithDots.length}`);

  await prisma.$disconnect();
}

audit();
