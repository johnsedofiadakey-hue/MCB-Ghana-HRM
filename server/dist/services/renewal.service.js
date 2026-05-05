"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenewalService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
/**
 * Renewal Service
 * Monitors infrastructure expiry dates and notifies developers.
 */
class RenewalService {
    /**
     * Checks for upcoming expirations and sends notifications.
     * Target: Users with role 'DEV'.
     */
    static async checkExpirations() {
        console.log('[RenewalService] Auditing infrastructure expiry dates...');
        const settings = await client_1.default.systemSettings.findFirst({
            where: { organizationId: 'mcb-ghana-tenant' }
        });
        if (!settings) {
            console.warn('[RenewalService] No system settings found for mcb-ghana-tenant.');
            return;
        }
        const now = new Date();
        const alertThresholds = [30, 7, 1]; // Days before expiry
        const devUsers = await client_1.default.user.findMany({
            where: { role: 'DEV', status: 'ACTIVE' },
            select: { id: true, email: true }
        });
        if (devUsers.length === 0) {
            console.warn('[RenewalService] No active DEV accounts found to notify.');
            return;
        }
        const checkAndNotify = async (date, label) => {
            if (!date)
                return;
            const diffTime = date.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (alertThresholds.includes(diffDays)) {
                const priority = diffDays <= 7 ? 'ERROR' : 'WARNING';
                const message = `${label} is due for renewal in ${diffDays} day(s). Action required to prevent service disruption.`;
                console.log(`[RenewalService] Alert triggered for ${label}: ${diffDays} days remaining.`);
                for (const dev of devUsers) {
                    await (0, websocket_service_1.notify)(dev.id, `RENEWAL ALERT: ${label} 🔌`, message, priority, '/settings');
                }
            }
        };
        await checkAndNotify(settings.domainExpiryDate, 'Domain Hosting');
        await checkAndNotify(settings.databaseExpiryDate, 'Database Instance');
    }
}
exports.RenewalService = RenewalService;
