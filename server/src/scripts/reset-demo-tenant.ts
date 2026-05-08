import prisma from '../prisma/client';
import { DemoSeederService } from '../services/demo-seeder.service';

/**
 * RESET DEMO TENANT ENGINE
 * Wipes all transactional and master data for the Acme Ghana Ltd demo tenant.
 * Re-seeds the baseline high-fidelity environment.
 */
export const resetDemoTenant = async () => {
    const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || 'acme-ghana-demo-001';
    
    console.log(`\n[Cron] 🔄 Starting Daily Demo Reset for ${DEMO_TENANT_ID}...`);
    
    try {
        // 1. Transactional Data Wipe (Order Matters due to FKs)
        const deleteOps = [
            prisma.auditLog.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.notification.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.announcement.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.leaveRequest.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.appraisalReview.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.appraisalPacket.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.performanceScore.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.performanceReviewV2.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.payrollItem.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.payrollRun.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.attendanceLog.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.assetAssignment.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.employeeDocument.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            prisma.disciplinaryCase.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
        ];

        await prisma.$transaction(deleteOps);
        console.log(`[Cron] 🗑️  Transactional data wiped.`);

        // 2. Master Identity Wipe
        await prisma.user.deleteMany({ where: { organizationId: DEMO_TENANT_ID } });
        console.log(`[Cron] 🗑️  Master identities wiped.`);

        // 3. Organization Structure Wipe
        await prisma.department.deleteMany({ where: { organizationId: DEMO_TENANT_ID } });
        console.log(`[Cron] 🗑️  Org structure wiped.`);

        // 4. Trigger High-Fidelity Re-Seeding
        await DemoSeederService.seedTenantData(DEMO_TENANT_ID);
        
        console.log(`[Cron] ✅ Demo Reset Complete. Acme Ghana Ltd is fresh.\n`);
        
    } catch (error: any) {
        console.error(`\n[Cron] ❌ Critical Failure during Demo Reset:`, error.message);
    }
};

// If run directly via ts-node
if (require.main === module) {
    resetDemoTenant()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
