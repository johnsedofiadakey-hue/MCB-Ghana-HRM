"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateHierarchy = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const validateHierarchy = async (req, res) => {
    try {
        const users = await client_1.default.user.findMany({
            select: {
                id: true,
                fullName: true,
                role: true,
                supervisorId: true
            }
        });
        const orphans = users.filter(u => u.role !== 'MD' && !u.supervisorId);
        // Auto-reattachment logic: Find the MD to use as default supervisor
        const md = await client_1.default.user.findFirst({ where: { role: 'MD' } });
        if (orphans.length > 0 && md) {
            await client_1.default.user.updateMany({
                where: {
                    id: { in: orphans.map(o => o.id) }
                },
                data: {
                    supervisorId: md.id
                }
            });
        }
        return res.json({
            success: true,
            orphansProcessed: orphans.length,
            reattachedTo: md?.fullName || 'None'
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.validateHierarchy = validateHierarchy;
