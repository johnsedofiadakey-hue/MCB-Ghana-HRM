"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("./prisma/client"));
async function main() {
    console.log('--- RAW DB AUDIT ---');
    const depts = await client_1.default.$queryRaw `SELECT id, organizationId, name FROM Department`;
    console.log('Departments:', JSON.stringify(depts, null, 2));
    const settings = await client_1.default.$queryRaw `SELECT id, organizationId, companyName FROM SystemSettings`;
    console.log('SystemSettings:', JSON.stringify(settings, null, 2));
    const users = await client_1.default.$queryRaw `SELECT id, fullName, organizationId, role FROM User WHERE role = 'MD'`;
    console.log('MD Users:', JSON.stringify(users, null, 2));
}
main().catch(console.error).finally(() => client_1.default.$disconnect());
