import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { RoleRank } from '../types/roles';

export const validateHierarchy = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                role: true,
                supervisorId: true
            }
        });

        const orphans = users.filter(u => u.role !== 'MD' && !u.supervisorId);

        // Auto-reattachment logic: Find the MD to use as default supervisor
        const md = await prisma.user.findFirst({ where: { role: 'MD' } });

        if (orphans.length > 0 && md) {
            await prisma.user.updateMany({
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
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};
