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
    const passwordHash = await bcryptjs_1.default.hash('unlockme', 12);
    const user = await prisma.user.upsert({
        where: { email: 'johnsedofiadakey@gmail.com' },
        update: {
            passwordHash,
            role: 'DEV',
            status: 'ACTIVE'
        },
        create: {
            fullName: 'John Sedofiadakey',
            email: 'johnsedofiadakey@gmail.com',
            passwordHash,
            role: 'DEV',
            status: 'ACTIVE',
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
