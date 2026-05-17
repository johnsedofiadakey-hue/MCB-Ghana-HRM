"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../prisma/client"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
const defaults = [
    { id: 'technical-delivery', name: 'Technical Delivery', description: 'Quality and timeliness of assigned work.', weight: 25 },
    { id: 'collaboration', name: 'Collaboration', description: 'Teamwork, communication, and knowledge sharing.', weight: 25 },
    { id: 'leadership', name: 'Leadership', description: 'Ownership, judgment, and support for others.', weight: 25 },
    { id: 'compliance', name: 'Compliance', description: 'Policy adherence and professional conduct.', weight: 25 },
];
const parseFeatures = (raw) => {
    try {
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
};
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const getCompetencies = async (organizationId) => {
    const org = await client_1.default.organization.findUnique({ where: { id: organizationId }, select: { features: true } });
    const features = parseFeatures(org?.features);
    return Array.isArray(features.competencies) ? features.competencies : defaults;
};
const saveCompetencies = async (organizationId, competencies) => {
    const org = await client_1.default.organization.findUnique({ where: { id: organizationId }, select: { features: true } });
    const features = parseFeatures(org?.features);
    await client_1.default.organization.update({
        where: { id: organizationId },
        data: { features: JSON.stringify({ ...features, competencies }) }
    });
};
router.get('/', async (req, res) => {
    const competencies = await getCompetencies(getOrgId(req));
    res.json(competencies);
});
router.post('/', (0, auth_middleware_1.requireRole)(80), async (req, res) => {
    const organizationId = getOrgId(req);
    const competencies = await getCompetencies(organizationId);
    const competency = {
        id: crypto_1.default.randomUUID(),
        name: String(req.body.name || '').trim(),
        description: String(req.body.description || '').trim(),
        weight: Number(req.body.weight || 0),
    };
    if (!competency.name)
        return res.status(400).json({ error: 'Competency name is required' });
    await saveCompetencies(organizationId, [...competencies, competency]);
    res.status(201).json(competency);
});
router.put('/:id', (0, auth_middleware_1.requireRole)(80), async (req, res) => {
    const organizationId = getOrgId(req);
    const competencies = await getCompetencies(organizationId);
    const next = competencies.map(c => c.id === req.params.id ? {
        ...c,
        name: String(req.body.name || c.name).trim(),
        description: String(req.body.description ?? c.description).trim(),
        weight: Number(req.body.weight ?? c.weight),
    } : c);
    await saveCompetencies(organizationId, next);
    res.json(next.find(c => c.id === req.params.id));
});
router.delete('/:id', (0, auth_middleware_1.requireRole)(80), async (req, res) => {
    const organizationId = getOrgId(req);
    const competencies = await getCompetencies(organizationId);
    await saveCompetencies(organizationId, competencies.filter(c => c.id !== req.params.id));
    res.json({ success: true });
});
exports.default = router;
