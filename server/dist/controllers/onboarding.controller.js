"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOnboardingSessions = exports.completeTask = exports.getMyOnboarding = exports.startOnboarding = exports.createTemplate = exports.getTemplates = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("../services/websocket.service");
const audit_service_1 = require("../services/audit.service");
// ─── Templates (Admin) ────────────────────────────────────────────────────
const getTemplates = async (_req, res) => {
    try {
        const templates = await client_1.default.onboardingTemplate.findMany({ include: { tasks: { orderBy: { order: 'asc' } } } });
        res.json(templates);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getTemplates = getTemplates;
const createTemplate = async (req, res) => {
    try {
        const { name, description, tasks } = req.body;
        const template = await client_1.default.onboardingTemplate.create({
            data: {
                name, description,
                tasks: { create: tasks?.map((t, i) => ({ ...t, order: i })) || [] }
            },
            include: { tasks: true }
        });
        res.status(201).json(template);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.createTemplate = createTemplate;
// ─── Sessions (Employee onboarding instances) ────────────────────────────
const startOnboarding = async (req, res) => {
    try {
        const { employeeId, templateId, startDate } = req.body;
        // @ts-ignore
        const actorId = req.user?.id;
        const template = await client_1.default.onboardingTemplate.findUnique({
            where: { id: templateId }, include: { tasks: { orderBy: { order: 'asc' } } }
        });
        if (!template)
            return res.status(404).json({ error: 'Template not found' });
        const session = await client_1.default.onboardingSession.create({
            data: {
                employeeId, templateId,
                startDate: startDate ? new Date(startDate) : new Date(),
                items: {
                    create: template.tasks.map(task => ({
                        taskId: task.id,
                        title: task.title,
                        category: task.category,
                        isRequired: task.isRequired,
                        dueDate: new Date(Date.now() + task.dueAfterDays * 24 * 60 * 60 * 1000)
                    }))
                }
            },
            include: { items: true, template: true }
        });
        await (0, websocket_service_1.notify)(employeeId, 'Onboarding Started 🎉', `Your onboarding checklist "${template.name}" is ready. Complete all tasks to get fully set up!`, 'INFO', '/onboarding');
        await (0, audit_service_1.logAction)(actorId, 'ONBOARDING_STARTED', 'OnboardingSession', session.id, { employeeId, template: template.name }, req.ip);
        res.status(201).json(session);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.startOnboarding = startOnboarding;
const getMyOnboarding = async (req, res) => {
    try { // @ts-ignore
        const userId = req.user?.id;
        const sessions = await client_1.default.onboardingSession.findMany({
            where: { employeeId: userId },
            include: { items: { orderBy: { dueDate: 'asc' } }, template: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(sessions);
    }
    catch (err) {
        console.error('[onboarding.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getMyOnboarding = getMyOnboarding;
const completeTask = async (req, res) => {
    try {
        const { itemId, notes } = req.body;
        // @ts-ignore
        const userId = req.user?.id;
        const item = await client_1.default.onboardingItem.update({
            where: { id: itemId },
            data: { completedAt: new Date(), completedBy: userId, notes }
        });
        // Recalculate progress
        const session = await client_1.default.onboardingSession.findUnique({
            where: { id: item.sessionId },
            include: { items: true }
        });
        if (session) {
            const total = session.items.length;
            const done = session.items.filter(i => i.completedAt || i.id === itemId).length;
            const progress = Math.round((done / total) * 100);
            const completedAt = progress === 100 ? new Date() : null;
            await client_1.default.onboardingSession.update({
                where: { id: session.id },
                data: { progress, ...(completedAt ? { completedAt } : {}) }
            });
            if (progress === 100) {
                await (0, websocket_service_1.notify)(session.employeeId, 'Onboarding Complete! 🏆', 'Congratulations! You have completed all onboarding tasks.', 'SUCCESS');
            }
        }
        res.json(item);
    }
    catch (e) {
        res.status(400).json({ error: e.message });
    }
};
exports.completeTask = completeTask;
const getAllOnboardingSessions = async (req, res) => {
    try {
        const sessions = await client_1.default.onboardingSession.findMany({
            include: {
                employee: { select: { fullName: true, jobTitle: true, avatarUrl: true } },
                template: { select: { name: true } },
                items: { select: { completedAt: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(sessions);
    }
    catch (err) {
        console.error('[onboarding.controller.ts]', err.message);
        if (!res.headersSent)
            res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
exports.getAllOnboardingSessions = getAllOnboardingSessions;
