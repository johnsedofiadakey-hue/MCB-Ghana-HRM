"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const demo_seeder_service_1 = require("../services/demo-seeder.service");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🚀 Creating Production and Demo Tenants...');
    const initialPassword = process.env.SEED_INITIAL_PASSWORD;
    if (!initialPassword || initialPassword.length < 16)
        throw new Error('SEED_INITIAL_PASSWORD must be at least 16 characters.');
    const commonPass = await bcryptjs_1.default.hash(initialPassword, 12);
    // 0. Master System Architect (Global Access)
    console.log('👑 Provisioning System Architect...');
    await prisma.user.upsert({
        where: { email: 'johnsedofiadakey@gmail.com' },
        update: { role: 'DEV' },
        create: {
            fullName: 'John Sedofiadakey',
            email: 'johnsedofiadakey@gmail.com',
            passwordHash: commonPass,
            role: 'DEV',
            status: 'ACTIVE',
            jobTitle: 'System Architect',
            organizationId: null,
            mustChangePassword: true,
        }
    });
    // 1. Create Production Tenant
    const prodOrg = await prisma.organization.upsert({
        where: { id: 'production-tenant' },
        update: {},
        create: {
            id: 'production-tenant',
            name: 'MCB-HRM Ghana Production',
            email: 'admin@prod-nexus.com',
            billingStatus: 'ACTIVE',
            subscriptionPlan: 'PRO',
            primaryColor: '#10b981', // Emerald
            customDomain: 'nexus-prod.local'
        }
    });
    console.log(`✅ Production Tenant Created: ${prodOrg.name}`);
    // Create standard MD for Prod
    await prisma.user.upsert({
        where: { email: 'md@prod-nexus.com' },
        update: {},
        create: {
            organizationId: prodOrg.id,
            fullName: 'Production MD',
            email: 'md@prod-nexus.com',
            passwordHash: commonPass,
            role: 'MD',
            status: 'ACTIVE',
            jobTitle: 'Managing Director',
            mustChangePassword: true,
        }
    });
    // 2. Create Demo Tenant
    const demoOrg = await prisma.organization.upsert({
        where: { id: 'demo-tenant-live' },
        update: {},
        create: {
            id: 'demo-tenant-live',
            name: 'MCB-HRM Ghana Demo Sandbox',
            email: 'admin@demo-nexus.com',
            billingStatus: 'FREE',
            subscriptionPlan: 'FREE',
            primaryColor: '#f59e0b', // Amber
            customDomain: 'nexus-demo.local'
        }
    });
    console.log(`✅ Demo Tenant Created: ${demoOrg.name}`);
    // Seed Demo Data
    console.log('🌱 Seeding Demo Data...');
    try {
        const creds = await demo_seeder_service_1.DemoSeederService.seedTenantData(demoOrg.id);
        console.log(`✅ Demo Data Seeded. MD Email: ${creds.mdEmail}`);
    }
    catch (e) {
        console.warn(`⚠️ Demo seeding skipped or failed (might already exist): ${e.message}`);
    }
    process.exit(0);
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
