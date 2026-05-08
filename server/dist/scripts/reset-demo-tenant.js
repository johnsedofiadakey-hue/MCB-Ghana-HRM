"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDemoTenant = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const demo_seeder_service_1 = require("../services/demo-seeder.service");
/**
 * RESET DEMO TENANT ENGINE
 * Wipes all transactional and master data for the Acme Ghana Ltd demo tenant.
 * Re-seeds the baseline high-fidelity environment.
 */
const resetDemoTenant = async () => {
    const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || 'acme-ghana-demo-001';
    console.log(`\n[Cron] 🔄 Starting Daily Demo Reset for ${DEMO_TENANT_ID}...`);
    try {
        // 1. Transactional Data Wipe (Order Matters due to FKs)
        const deleteOps = [
            client_1.default.auditLog.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.notification.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.announcement.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.leaveRequest.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.appraisalReview.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.appraisalPacket.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.performanceScore.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.performanceReviewV2.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.payrollItem.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.payrollRun.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.attendanceLog.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.assetAssignment.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.employeeDocument.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
            client_1.default.disciplinaryCase.deleteMany({ where: { organizationId: DEMO_TENANT_ID } }),
        ];
        await client_1.default.$transaction(deleteOps);
        console.log(`[Cron] 🗑️  Transactional data wiped.`);
        // 2. Master Identity Wipe
        await client_1.default.user.deleteMany({ where: { organizationId: DEMO_TENANT_ID } });
        console.log(`[Cron] 🗑️  Master identities wiped.`);
        // 3. Organization Structure Wipe
        await client_1.default.department.deleteMany({ where: { organizationId: DEMO_TENANT_ID } });
        console.log(`[Cron] 🗑️  Org structure wiped.`);
        // 4. Trigger High-Fidelity Re-Seeding
        await demo_seeder_service_1.DemoSeederService.seedTenantData(DEMO_TENANT_ID);
        console.log(`[Cron] ✅ Demo Reset Complete. Acme Ghana Ltd is fresh.\n`);
    }
    catch (error) {
        console.error(`\n[Cron] ❌ Critical Failure during Demo Reset:`, error.message);
    }
};
exports.resetDemoTenant = resetDemoTenant;
// If run directly via ts-node
if (require.main === module) {
    (0, exports.resetDemoTenant)()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
