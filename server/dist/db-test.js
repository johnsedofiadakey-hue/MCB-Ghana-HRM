"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
async function run() {
    console.log('--- MCB DATABASE DIAGNOSTIC ---');
    try {
        const packetCount = await prisma.appraisalPacket.count();
        console.log(`Total AppraisalPackets: ${packetCount}`);
        const packets = await prisma.appraisalPacket.findMany({
            take: 5,
            include: { cycle: true, employee: true }
        });
        console.log('Sample Packets:', JSON.stringify(packets, null, 2));
    }
    catch (err) {
        console.error('CRITICAL DATABASE ERROR:', err.message);
        console.error(err.stack);
    }
    finally {
        await prisma.$disconnect();
    }
}
run();
