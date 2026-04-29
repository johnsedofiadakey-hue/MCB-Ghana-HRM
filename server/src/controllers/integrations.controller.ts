import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma/client';

const getOrgId = (req: Request) => (req as any).user?.organizationId || 'mcb-ghana-tenant';

// ── API Keys ───────────────────────────────────────────────────────────────

export const listApiKeys = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        // We do NOT return the keyHash, just the metadata
        const keys = await prisma.apiKey.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true, lastUsedAt: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(keys);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const createApiKey = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Generate a new secure API Key
        const rawKey = `nx_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const apiKey = await prisma.apiKey.create({
            data: {
                organizationId: orgId,
                name,
                keyHash
            }
        });

        // We return the raw key ONLY once on creation
        res.status(201).json({ 
            id: apiKey.id, 
            name: apiKey.name, 
            createdAt: apiKey.createdAt,
            key: rawKey // IMPORTANT: Sent only once
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const revokeApiKey = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        await prisma.apiKey.deleteMany({
            where: { id, organizationId: orgId }
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

// ── Webhooks ───────────────────────────────────────────────────────────────

export const listWebhooks = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const hooks = await prisma.webhookSubscription.findMany({
            where: { organizationId: orgId },
            select: { id: true, url: true, events: true, isActive: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(hooks);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const createWebhook = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { url, events, secret } = req.body;
        if (!url || !events) return res.status(400).json({ error: 'URL and Events are required' });

        const hook = await prisma.webhookSubscription.create({
            data: {
                organizationId: orgId,
                url,
                events, // e.g. "EMPLOYEE_CREATED,LEAVE_APPROVED"
                secret: secret || null
            }
        });
        
        // Don't leak secret back
        const { secret: _, ...safeHook } = hook;
        res.status(201).json(safeHook);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};

export const deleteWebhook = async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        await prisma.webhookSubscription.deleteMany({
            where: { id, organizationId: orgId }
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
