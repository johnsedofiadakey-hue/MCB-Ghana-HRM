"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const maintenance_service_1 = require("../services/maintenance.service");
const renewal_service_1 = require("../services/renewal.service");
const client_1 = __importDefault(require("../prisma/client"));
async function verify() {
    console.log('--- 🛡️ VERIFYING SYSTEM SAFETY ---');
    // 1. Test Backup
    console.log('\n[1/2] Triggering Manual Backup...');
    try {
        const result = await (0, maintenance_service_1.runBackup)();
        console.log('✅ Backup Successful:', result);
    }
    catch (e) {
        console.error('❌ Backup Failed:', e);
    }
    // 2. Test Renewal Reminders
    console.log('\n[2/2] Testing Renewal Reminders...');
    try {
        // Set a date exactly 7 days from now to trigger the WARNING alert
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 7);
        const settings = await client_1.default.systemSettings.findFirst({
            where: { organizationId: 'mcb-ghana-tenant' }
        });
        if (settings) {
            await client_1.default.systemSettings.update({
                where: { id: settings.id },
                data: {
                    domainExpiryDate: targetDate,
                    databaseExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                }
            });
        }
        console.log('⏳ Running Expiration Check (Alert expected for Domain)...');
        await renewal_service_1.RenewalService.checkExpirations();
        console.log('✅ Renewal Audit Complete.');
    }
    catch (e) {
        console.error('❌ Renewal Test Failed:', e);
    }
    process.exit(0);
}
verify();
