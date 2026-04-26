import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedGhanaHolidays() {
    const orgId = 'default-tenant';

    const holidays = [
        { name: "New Year's Day", date: new Date('2026-01-01') },
        { name: "Constitution Day", date: new Date('2026-01-07') },
        { name: "Independence Day", date: new Date('2026-03-06') },
        { name: "Good Friday", date: new Date('2026-04-03') },
        { name: "Easter Monday", date: new Date('2026-04-06') },
        { name: "Eid-ul-Fitr", date: new Date('2026-03-31') }, 
        { name: "May Day (Workers' Day)", date: new Date('2026-05-01') },
        { name: "Eid-ul-Adha", date: new Date('2026-06-07') }, 
        { name: "Founders' Day", date: new Date('2026-08-04') },
        { name: "Kwame Nkrumah Memorial Day", date: new Date('2026-09-21') },
        { name: "Farmers' Day", date: new Date('2026-12-04') },
        { name: "Christmas Day", date: new Date('2026-12-25') },
        { name: "Boxing Day", date: new Date('2026-12-26') },
    ];

    console.log('🇬🇭 Seeding Ghana Holidays for 2026...');

    for (const h of holidays) {
        // Since there is no unique constraint on (org, date), we check manually
        const existing = await prisma.publicHoliday.findFirst({
            where: {
                organizationId: orgId,
                date: h.date,
                country: 'GH'
            }
        });

        if (existing) {
            await prisma.publicHoliday.update({
                where: { id: existing.id },
                data: { name: h.name }
            });
        } else {
            await prisma.publicHoliday.create({
                data: {
                    organizationId: orgId,
                    name: h.name,
                    date: h.date,
                    country: 'GH',
                    isRecurring: true
                }
            });
        }
    }

    console.log('✅ Ghana Holidays synchronized.');
}

seedGhanaHolidays()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
