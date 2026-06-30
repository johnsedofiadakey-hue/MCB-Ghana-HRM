"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🛡️ Emergency Identity Sync: johnsedofiadakey@gmail.com');
    const recoveryPassword = process.env.RECOVERY_ACCOUNT_PASSWORD;
    if (!recoveryPassword || recoveryPassword.length < 16)
        throw new Error('RECOVERY_ACCOUNT_PASSWORD must be at least 16 characters.');
    const passwordHash = await bcryptjs_1.default.hash(recoveryPassword, 12);
    const user = await prisma.user.upsert({
        where: { email: 'johnsedofiadakey@gmail.com' },
        update: {
            passwordHash,
            role: 'DEV',
            status: 'ACTIVE',
            mustChangePassword: true
        },
        create: {
            fullName: 'John Sedofiadakey',
            email: 'johnsedofiadakey@gmail.com',
            passwordHash,
            role: 'DEV',
            status: 'ACTIVE',
            mustChangePassword: true,
            jobTitle: 'System Architect'
        }
    });
    console.log('✅ Identity Verified and Password Synchronized:', user.email);
    process.exit(0);
}
main().catch(err => {
    console.error('❌ Sync Failed:', err);
    process.exit(1);
});
