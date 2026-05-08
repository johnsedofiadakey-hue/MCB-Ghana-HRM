"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function initSubdomains() {
    console.log('🌐 Provisioning infrastructure subdomains...');
    const orgs = await prisma.organization.findMany();
    for (const org of orgs) {
        if (org.subdomain) {
            console.log(`  ⏭️ ${org.name} already has subdomain: ${org.subdomain}`);
            continue;
        }
        let subdomain = '';
        // Custom mappings
        if (org.name === 'Production Tenant' || org.name.includes('Production')) {
            subdomain = 'nexus';
        }
        else if (org.name === 'Demo Sandbox' || org.name.includes('Demo')) {
            subdomain = 'demo';
        }
        else {
            // Slugify name
            subdomain = org.name
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }
        // Ensure uniqueness
        let finalSubdomain = subdomain;
        let counter = 1;
        while (true) {
            const existing = await prisma.organization.findUnique({ where: { subdomain: finalSubdomain } });
            if (!existing)
                break;
            finalSubdomain = `${subdomain}-${counter++}`;
        }
        await prisma.organization.update({
            where: { id: org.id },
            data: {
                subdomain: finalSubdomain,
                domainStatus: 'VERIFIED'
            }
        });
        console.log(`  ✅ Assigned ${finalSubdomain} to ${org.name}`);
    }
    console.log('🎉 Subdomain provisioning complete!');
}
initSubdomains()
    .catch((e) => {
    console.error('❌ Provisioning failed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
