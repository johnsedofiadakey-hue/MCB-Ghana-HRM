"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeOnboarding = exports.getDepartmentTasks = exports.getAllOnboardingSessions = exports.completeTask = exports.getMyOnboarding = exports.startOnboarding = exports.createTemplate = exports.getTemplates = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const websocket_service_1 = require("../services/websocket.service");
const audit_service_1 = require("../services/audit.service");
const permissions_1 = require("../types/permissions");
// Which ownerRole values each system role is responsible for
const roleOwnerMap = {
    HR_DIRECTOR: ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER'],
    HR_MANAGER: ['HR_MANAGER', 'HR_OFFICER'],
    HR_OFFICER: ['HR_OFFICER'],
    IT_MANAGER: ['IT_MANAGER', 'IT_ADMIN'],
    IT_ADMIN: ['IT_ADMIN'],
    MANAGER: ['MANAGER'],
    DIRECTOR: ['MANAGER', 'DIRECTOR'],
    MD: ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER', 'DIRECTOR', 'Admin'],
    DEV: ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN', 'MANAGER', 'DIRECTOR', 'Admin'],
};
// Legacy permission-key map kept for any future policy checks
const ownerPermission = {
    HR_DIRECTOR: permissions_1.Permission.ONBOARDING_MANAGE,
    HR_MANAGER: permissions_1.Permission.ONBOARDING_MANAGE,
    IT_MANAGER: permissions_1.Permission.ACCOUNT_PROVISION,
    IT_ADMIN: permissions_1.Permission.ACCOUNT_PROVISION,
};
const DEFAULT_TEMPLATES = [
    {
        name: 'General Staff Onboarding',
        description: 'Standard onboarding checklist for all new employees',
        isDefault: true,
        tasks: [
            { title: 'Welcome & Orientation', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 1, description: 'Welcome meeting with HR — company values, culture, and org structure.' },
            { title: 'Employment Contract Signing', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 2, description: 'Sign employment contract, NDA, and policy acknowledgements.' },
            { title: 'Payroll & Benefits Registration', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 2, order: 3, description: 'Register bank account, SSNIT number, and select applicable benefits.' },
            { title: 'System Account Setup', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 4, description: 'Create company email, HRM portal login, and grant role-based system access.' },
            { title: 'ID Card & Access Card Issuance', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 3, order: 5, autoCompleteEvent: 'ID_CARD_ISSUED', description: 'Print and issue employee photo ID and building access card.' },
            { title: 'Workstation & Equipment Setup', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 2, order: 6, autoCompleteEvent: 'ASSET_ASSIGNED', description: 'Assign device, configure peripherals, install required software.' },
            { title: 'Department Introduction', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 2, order: 7, description: 'Line manager introduces the new employee to the team and explains workflow.' },
            { title: 'Role & Responsibilities Briefing', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 3, order: 8, description: 'Walk through KPIs, reporting structure, and 30/60/90 day expectations.' },
            { title: 'Health & Safety Training', category: 'Admin', ownerRole: 'HR_OFFICER', dueAfterDays: 5, order: 9, description: 'Mandatory health & safety briefing and fire evacuation procedures.' },
            { title: 'Probation Check-in (30 Days)', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 30, order: 10, description: 'First probation review — confirm settling in, address any concerns.' },
        ],
    },
    {
        name: 'IT Staff Onboarding',
        description: 'Technical onboarding for IT team members',
        isDefault: false,
        tasks: [
            { title: 'Welcome & Security Briefing', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 1, description: 'Security policies, data handling protocols, and acceptable use policy.' },
            { title: 'System & Network Access', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 2, description: 'Set up VPN, internal network, server access, and admin tools.' },
            { title: 'Development Environment Setup', category: 'IT', ownerRole: 'IT_ADMIN', dueAfterDays: 2, order: 3, description: 'Clone repos, configure IDE, install dev tools, set up local environment.' },
            { title: 'HR Portal Account & ID Card', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 4, autoCompleteEvent: 'ID_CARD_ISSUED', description: 'Provision HRM login and issue photo ID and access card.' },
            { title: 'Employment Contract & NDA', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 5, description: 'Sign employment contract and confidentiality agreement.' },
            { title: 'Payroll Registration', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 2, order: 6, description: 'Register bank details and SSNIT number.' },
            { title: 'Codebase & Systems Walkthrough', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 3, order: 7, description: 'Senior team member walks through architecture, systems, and open projects.' },
            { title: '30-Day Technical Review', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 30, order: 8, description: 'Review progress and assign first independent project.' },
        ],
    },
    {
        name: 'Management & Senior Staff Onboarding',
        description: 'Onboarding for managers, directors, and senior leadership',
        isDefault: false,
        tasks: [
            { title: 'Executive Welcome Meeting', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 1, description: 'Meet MD and senior leadership. Discuss strategy and org structure.' },
            { title: 'Employment & Confidentiality Documents', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 1, order: 2, description: 'Sign employment contract, NDA, and senior management conduct policy.' },
            { title: 'Compensation & Benefits Briefing', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 2, order: 3, description: 'Review compensation, allowances, pension, vehicle, and executive benefits.' },
            { title: 'System Access & Executive Tools', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 1, order: 4, description: 'HRM admin access, reporting dashboards, email, and device setup.' },
            { title: 'ID Card & Full Access Credentials', category: 'IT', ownerRole: 'IT_MANAGER', dueAfterDays: 2, order: 5, autoCompleteEvent: 'ID_CARD_ISSUED', description: 'Issue executive ID card and full building access credentials.' },
            { title: 'Department Handover Briefing', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 3, order: 6, description: 'Full briefing on team structure, current projects, and open issues.' },
            { title: 'Stakeholder Introductions', category: 'Admin', ownerRole: 'HR_DIRECTOR', dueAfterDays: 5, order: 7, description: 'Introduce to key internal stakeholders, clients, and partners.' },
            { title: 'Strategic Goals Alignment', category: 'Manager', ownerRole: 'MANAGER', dueAfterDays: 7, order: 8, description: 'Align on 90-day plan, OKRs, and reporting expectations.' },
            { title: '60-Day Leadership Review', category: 'HR', ownerRole: 'HR_DIRECTOR', dueAfterDays: 60, order: 9, description: 'Assess integration, early wins, and leadership effectiveness.' },
        ],
    },
];
// ─── Templates (Admin) ────────────────────────────────────────────────────
const getTemplates = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        let templates = await client_1.default.onboardingTemplate.findMany({ where: { organizationId }, include: { tasks: { orderBy: { order: 'asc' } } } });
        // Auto-seed default templates on first use
        if (templates.length === 0) {
            for (const tmpl of DEFAULT_TEMPLATES) {
                await client_1.default.onboardingTemplate.create({
                    data: {
                        organizationId, name: tmpl.name, description: tmpl.description, isDefault: tmpl.isDefault,
                        tasks: { create: tmpl.tasks.map(t => ({ organizationId, ...t })) },
                    },
                });
            }
            templates = await client_1.default.onboardingTemplate.findMany({ where: { organizationId }, include: { tasks: { orderBy: { order: 'asc' } } } });
        }
        // One-time patch: wire autoCompleteEvent onto existing tasks/items that predate this field
        const idCardTitles = ['ID Card', 'Access Card', 'Access Credentials'];
        const equipTitles = ['Workstation', 'Equipment Setup'];
        await Promise.all([
            ...idCardTitles.map(t => client_1.default.onboardingTask.updateMany({
                where: { organizationId, title: { contains: t }, autoCompleteEvent: null },
                data: { autoCompleteEvent: 'ID_CARD_ISSUED' },
            })),
            ...equipTitles.map(t => client_1.default.onboardingTask.updateMany({
                where: { organizationId, title: { contains: t }, autoCompleteEvent: null },
                data: { autoCompleteEvent: 'ASSET_ASSIGNED' },
            })),
            ...idCardTitles.map(t => client_1.default.onboardingItem.updateMany({
                where: { organizationId, title: { contains: t }, autoCompleteEvent: null },
                data: { autoCompleteEvent: 'ID_CARD_ISSUED' },
            })),
            ...equipTitles.map(t => client_1.default.onboardingItem.updateMany({
                where: { organizationId, title: { contains: t }, autoCompleteEvent: null },
                data: { autoCompleteEvent: 'ASSET_ASSIGNED' },
            })),
        ]);
        templates = await client_1.default.onboardingTemplate.findMany({ where: { organizationId }, include: { tasks: { orderBy: { order: 'asc' } } } });
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
        const user = req.user;
        const isAssignee = current.assignedToId === userId;
        const isEmployeeTask = current.ownerRole === 'EMPLOYEE' && current.session.employeeId === userId;
        const myOwnerRoles = roleOwnerMap[user.role] || [];
        const isDepartmentOwner = myOwnerRoles.includes(current.ownerRole);
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
        const myOwnerRoles = roleOwnerMap[user.role] || [];
        const tasks = await client_1.default.onboardingItem.findMany({
            where: {
                organizationId,
                OR: [
                    { assignedToId: user.id },
                    ...(myOwnerRoles.length ? [{ ownerRole: { in: myOwnerRoles } }] : []),
                ],
            },
            include: {
                session: {
                    include: {
                        employee: { select: { id: true, fullName: true, jobTitle: true, avatarUrl: true } },
                    },
                },
            },
            orderBy: [{ completedAt: 'asc' }, { dueDate: 'asc' }],
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
