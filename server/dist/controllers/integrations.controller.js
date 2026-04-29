"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWebhook = exports.createWebhook = exports.listWebhooks = exports.revokeApiKey = exports.createApiKey = exports.listApiKeys = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../prisma/client"));
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
// ── API Keys ───────────────────────────────────────────────────────────────
const listApiKeys = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        // We do NOT return the keyHash, just the metadata
        const keys = await client_1.default.apiKey.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true, lastUsedAt: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(keys);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.listApiKeys = listApiKeys;
const createApiKey = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        // Generate a new secure API Key
        const rawKey = `nx_${crypto_1.default.randomBytes(32).toString('hex')}`;
        const keyHash = crypto_1.default.createHash('sha256').update(rawKey).digest('hex');
        const apiKey = await client_1.default.apiKey.create({
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.createApiKey = createApiKey;
const revokeApiKey = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        await client_1.default.apiKey.deleteMany({
            where: { id, organizationId: orgId }
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.revokeApiKey = revokeApiKey;
// ── Webhooks ───────────────────────────────────────────────────────────────
const listWebhooks = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const hooks = await client_1.default.webhookSubscription.findMany({
            where: { organizationId: orgId },
            select: { id: true, url: true, events: true, isActive: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(hooks);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.listWebhooks = listWebhooks;
const createWebhook = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { url, events, secret } = req.body;
        if (!url || !events)
            return res.status(400).json({ error: 'URL and Events are required' });
        const hook = await client_1.default.webhookSubscription.create({
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
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.createWebhook = createWebhook;
const deleteWebhook = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        await client_1.default.webhookSubscription.deleteMany({
            where: { id, organizationId: orgId }
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
};
exports.deleteWebhook = deleteWebhook;
