"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function audit() {
    console.log('--- Deep Audit: Finding Dot-Separated Strings ---');
    // 1. Users
    const users = await prisma.user.findMany({
        where: { OR: [{ fullName: { contains: '.' } }, { jobTitle: { contains: '.' } }] }
    });
    console.log(`Users with dots: ${users.length}`);
    for (const u of users) {
        const fixedName = u.fullName?.replace(/\./g, ' ');
        const fixedTitle = u.jobTitle?.replace(/\./g, ' ');
        console.log(`  Updating User [${u.id}]: "${u.fullName}" -> "${fixedName}"`);
        await prisma.user.update({
            where: { id: u.id },
            data: { fullName: fixedName, jobTitle: fixedTitle }
        });
    }
    // 2. Organizations
    const orgs = await prisma.organization.findMany({
        where: { OR: [{ name: { contains: '.' } }, { subtitle: { contains: '.' } }] }
    });
    console.log(`Organizations with dots: ${orgs.length}`);
    for (const o of orgs) {
        const fixedName = o.name?.replace(/\./g, ' ');
        const fixedSubtitle = o.subtitle?.replace(/\./g, ' ');
        console.log(`  Updating Org [${o.id}]: "${o.name}" -> "${fixedName}"`);
        await prisma.organization.update({
            where: { id: o.id },
            data: { name: fixedName, subtitle: fixedSubtitle }
        });
    }
    // 3. Departments
    const depts = await prisma.department.findMany({
        where: { name: { contains: '.' } }
    });
    console.log(`Departments with dots: ${depts.length}`);
    for (const d of depts) {
        const fixedName = d.name?.replace(/\./g, ' ');
        console.log(`  Updating Dept [${d.id}]: "${d.name}" -> "${fixedName}"`);
        await prisma.department.update({
            where: { id: d.id },
            data: { name: fixedName }
        });
    }
    // 4. Appraisal Cycles
    const cycles = await prisma.appraisalCycle.findMany({
        where: { title: { contains: '.' } }
    });
    console.log(`Appraisal Cycles with dots: ${cycles.length}`);
    for (const c of cycles) {
        const fixedTitle = c.title?.replace(/\./g, ' ');
        console.log(`  Updating Cycle [${c.id}]: "${c.title}" -> "${fixedTitle}"`);
        await prisma.appraisalCycle.update({
            where: { id: c.id },
            data: { title: fixedTitle }
        });
    }
    console.log('--- Deep Audit Complete ---');
    await prisma.$disconnect();
}
audit().catch(e => {
    console.error(e);
    process.exit(1);
});
