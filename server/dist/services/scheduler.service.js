"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("./websocket.service");
class SchedulerService {
    static init() {
        console.log('⏰ Scheduler Service Initialized (Birthday Watcher Activated)');
        // Run at 00:05 every day to check for upcoming birthdays
        node_cron_1.default.schedule('5 0 * * *', async () => {
            console.log('[Scheduler] Running Daily Birthday Sweep...');
            await this.checkUpcomingBirthdays();
        });
    }
    static async checkUpcomingBirthdays() {
        try {
            const today = new Date();
            // Check for 7 days (1 week) and 1 day before
            const targets = [
                { days: 7, label: 'one week' },
                { days: 1, label: 'tomorrow' }
            ];
            for (const target of targets) {
                const targetDate = new Date();
                targetDate.setDate(today.getDate() + target.days);
                const targetMonth = targetDate.getMonth() + 1; // 1-12
                const targetDay = targetDate.getDate();
                const usersWithBirthday = await client_1.default.user.findMany({
                    where: {
                        isArchived: false,
                        status: 'ACTIVE',
                        dob: { not: null }
                    },
                    select: {
                        id: true,
                        fullName: true,
                        dob: true,
                        organizationId: true
                    }
                });
                const upcomingBirthdayList = usersWithBirthday.filter(u => {
                    if (!u.dob)
                        return false;
                    const d = new Date(u.dob);
                    return (d.getMonth() + 1) === targetMonth && d.getDate() === targetDay;
                });
                if (upcomingBirthdayList.length === 0)
                    continue;
                console.log(`[Scheduler] Found ${upcomingBirthdayList.length} birthdays in ${target.days} days.`);
                for (const emp of upcomingBirthdayList) {
                    const admins = await client_1.default.user.findMany({
                        where: {
                            organizationId: emp.organizationId,
                            role: { in: ['MD', 'HR_OFFICER'] },
                            status: 'ACTIVE',
                            isArchived: false
                        },
                        select: { id: true }
                    });
                    const alertMessage = `🎂 Birthday Alert: ${emp.fullName} has a birthday ${target.label} (${targetMonth}/${targetDay})!`;
                    for (const admin of admins) {
                        await (0, websocket_service_1.notify)(admin.id, '🎈 Upcoming Birthday Alert', alertMessage, 'INFO', '/employees');
                    }
                }
            }
        }
        catch (error) {
            console.error('[Scheduler] Birthday Sweep Critical Error:', error);
        }
    }
}
exports.SchedulerService = SchedulerService;
