"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'dev@nexus.com';
    const password = process.env.RECOVERY_ACCOUNT_PASSWORD;
    if (!password || password.length < 16)
        throw new Error('RECOVERY_ACCOUNT_PASSWORD must be at least 16 characters.');
    const fullName = 'System Developer';
    console.log(`Creating dev account: ${email}...`);
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            passwordHash,
            role: 'DEV',
            organizationId: 'mcb-ghana-tenant',
            status: 'ACTIVE',
            mustChangePassword: true,
        },
        create: {
            email,
            fullName,
            passwordHash,
            role: 'DEV',
            organizationId: 'mcb-ghana-tenant',
            status: 'ACTIVE',
            mustChangePassword: true,
            jobTitle: 'Lead Developer'
        }
    });
    console.log(`Success! Dev account ${email} is ready and requires a password change.`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
