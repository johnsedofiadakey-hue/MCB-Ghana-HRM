"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeOnboarding = exports.getDepartmentTasks = exports.getAllOnboardingSessions = exports.completeTask = exports.getMyOnboarding = exports.startOnboarding = exports.createTemplate = exports.getTemplates = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("../services/websocket.service");
const audit_service_1 = require("../services/audit.service");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const ownerPermission = {
    HR: permissions_1.Permission.ONBOARDING_MANAGE,
    IT: permissions_1.Permission.ACCOUNT_PROVISION,
    MARKETING: permissions_1.Permission.CARD_PRODUCTION,
};
// ─── Templates (Admin) ────────────────────────────────────────────────────
const getTemplates = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const templates = await client_1.default.onboardingTemplate.findMany({ where: { organizationId }, include: { tasks: { orderBy: { order: 'asc' } } } });
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
        const organizationId = req.user.organizationId;
        const template = await client_1.default.onboardingTemplate.create({
            data: {
                organizationId, name, description,
                tasks: { create: tasks?.map((t, i) => ({ ...t, organizationId, order: i })) || [] }
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
        const organizationId = req.user.organizationId;
        const template = await client_1.default.onboardingTemplate.findFirst({
            where: { id: templateId, organizationId }, include: { tasks: { orderBy: { order: 'asc' } } }
        });
        if (!template)
            return res.status(404).json({ error: 'Template not found' });
        const employee = await client_1.default.user.findFirst({ where: { id: employeeId, organizationId }, select: { supervisorId: true } });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        const session = await client_1.default.onboardingSession.create({
            data: {
                organizationId, employeeId, templateId,
                startDate: startDate ? new Date(startDate) : new Date(),
                items: {
                    create: template.tasks.map(task => ({
                        taskId: task.id,
                        organizationId,
                        title: task.title,
                        category: task.category,
                        ownerRole: task.ownerRole,
                        assignedToId: task.ownerRole === 'MANAGER' ? employee.supervisorId : null,
                        autoCompleteEvent: task.autoCompleteEvent,
                        status: 'PENDING',
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
        const organizationId = req.user.organizationId;
        const sessions = await client_1.default.onboardingSession.findMany({
            where: { employeeId: userId, organizationId },
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
        const { itemId, notes, evidenceUrl } = req.body;
        // @ts-ignore
        const userId = req.user?.id;
        const organizationId = req.user.organizationId;
        const current = await client_1.default.onboardingItem.findFirst({
            where: { id: itemId, organizationId },
            include: { session: { select: { employeeId: true } } },
        });
        if (!current)
            return res.status(404).json({ error: 'Onboarding task not found' });
        if (current.dependsOnItemId) {
            const dependency = await client_1.default.onboardingItem.findFirst({ where: { id: current.dependsOnItemId, organizationId } });
            if (!dependency || !['COMPLETED', 'VERIFIED'].includes(dependency.status)) {
                return res.status(409).json({ error: 'This task is blocked by an incomplete dependency.' });
            }
        }
        const isAssignee = current.assignedToId === userId;
        const isEmployeeTask = current.ownerRole === 'EMPLOYEE' && current.session.employeeId === userId;
        const permission = ownerPermission[current.ownerRole];
        const isDepartmentOwner = permission
            ? (await policy_service_1.PolicyService.evaluatePolicy(userId || '', permission)).allowed
            : false;
        if (!isAssignee && !isEmployeeTask && !isDepartmentOwner) {
            return res.status(403).json({ error: 'This task belongs to another employee or department.' });
        }
        const item = await client_1.default.onboardingItem.update({
            where: { id: current.id },
            data: { completedAt: new Date(), completedBy: userId, notes, evidenceUrl, status: 'COMPLETED' }
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
                data: { progress, status: completedAt ? 'AWAITING_HR_CLOSE' : 'IN_PROGRESS', ...(completedAt ? { completedAt } : {}) }
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
        const organizationId = req.user.organizationId;
        const sessions = await client_1.default.onboardingSession.findMany({
            where: { organizationId },
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
const getDepartmentTasks = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const owners = [];
        for (const [owner, permission] of Object.entries(ownerPermission)) {
            if ((await policy_service_1.PolicyService.evaluatePolicy(user.id, permission)).allowed)
                owners.push(owner);
        }
        const tasks = await client_1.default.onboardingItem.findMany({
            where: {
                organizationId,
                OR: [{ assignedToId: user.id }, ...(owners.length ? [{ ownerRole: { in: owners } }] : [])],
            },
            include: { session: { include: { employee: { select: { id: true, fullName: true, jobTitle: true } } } } },
            orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        });
        return res.json(tasks);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getDepartmentTasks = getDepartmentTasks;
const closeOnboarding = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const session = await client_1.default.onboardingSession.findFirst({
            where: { id: req.params.id, organizationId },
            include: { items: true },
        });
        if (!session)
            return res.status(404).json({ error: 'Onboarding session not found' });
        const incomplete = session.items.filter((item) => item.isRequired && !['COMPLETED', 'VERIFIED'].includes(item.status));
        if (incomplete.length)
            return res.status(409).json({ error: `${incomplete.length} required task(s) remain incomplete.` });
        await client_1.default.$transaction([
            client_1.default.onboardingSession.update({ where: { id: session.id }, data: { status: 'COMPLETED', progress: 100, completedAt: new Date() } }),
            client_1.default.user.update({ where: { id: session.employeeId }, data: { employeeLifecycleStage: 'ACTIVE' } }),
        ]);
        await (0, audit_service_1.logAction)(user.id, 'ONBOARDING_CLOSED', 'OnboardingSession', session.id, { employeeId: session.employeeId }, req.ip);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.closeOnboarding = closeOnboarding;
