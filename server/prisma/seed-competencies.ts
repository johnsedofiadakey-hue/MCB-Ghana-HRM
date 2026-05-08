import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCompetencies = [
    {
        name: 'Leadership & Initiative',
        description: 'Demonstrates ability to lead teams, take initiative, and inspire others to achieve goals.',
        weight: 1.0,
    },
    {
        name: 'Communication Skills',
        description: 'Effectively communicates ideas, listens actively, and collaborates with team members and stakeholders.',
        weight: 1.0,
    },
    {
        name: 'Technical Expertise',
        description: 'Possesses strong technical skills and continuously develops expertise in relevant areas.',
        weight: 1.2, // Slightly higher weight for technical roles
    },
    {
        name: 'Teamwork & Collaboration',
        description: 'Works effectively with others, contributes to team success, and supports colleagues.',
        weight: 1.0,
    },
    {
        name: 'Problem Solving',
        description: 'Identifies issues, analyzes situations, and develops creative solutions to challenges.',
        weight: 1.1,
    },
    {
        name: 'Time Management',
        description: 'Manages time effectively, meets deadlines, and prioritizes tasks appropriately.',
        weight: 0.9,
    },
    {
        name: 'Adaptability & Learning',
        description: 'Adapts to change, learns new skills quickly, and embraces continuous improvement.',
        weight: 1.0,
    },
    {
        name: 'Customer Focus',
        description: 'Understands customer needs, delivers quality service, and maintains strong relationships.',
        weight: 1.0,
    },
];

async function seedCompetencies() {
    console.log('🌱 Seeding competencies...');

    try {
        // Check if competencies already exist
        const existingCount = await prisma.competency.count();

        if (existingCount > 0) {
            console.log(`⚠️  Found ${existingCount} existing competencies. Skipping seed.`);
            console.log('💡 To re-seed, delete existing competencies first or modify this script.');
            return;
        }

        // Create all competencies
        for (const comp of defaultCompetencies) {
            await prisma.competency.create({
                data: comp,
            });
            console.log(`   ✓ Created: ${comp.name}`);
        }

        console.log(`\n✅ Successfully seeded ${defaultCompetencies.length} competencies!`);

        // Display them
        const all = await prisma.competency.findMany();
        console.log('\n📋 Current competencies:');
        all.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.name} (weight: ${c.weight})`);
        });

    } catch (error) {
        console.error('❌ Error seeding competencies:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedCompetencies()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
