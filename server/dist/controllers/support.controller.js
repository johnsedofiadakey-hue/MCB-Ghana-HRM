"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeads = exports.createLead = exports.createKnowledgeArticle = exports.listKnowledgeArticles = exports.getQueueDashboard = exports.reopenTicket = exports.updateTicketStatus = exports.addComment = exports.getTicketDetails = exports.getAllTickets = exports.getMyTickets = exports.createTicket = exports.businessMinutesBetween = exports.addBusinessHours = exports.addBusinessMinutes = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
const policy_service_1 = require("../services/policy.service");
const permissions_1 = require("../types/permissions");
const queuePermissions = {
    IT: permissions_1.Permission.HELPDESK_IT,
    HR: permissions_1.Permission.HELPDESK_HR,
    FINANCE: permissions_1.Permission.HELPDESK_FINANCE,
    MARKETING: permissions_1.Permission.HELPDESK_MARKETING,
    FACILITIES: permissions_1.Permission.HELPDESK_FACILITIES,
    OTHER: permissions_1.Permission.HELPDESK_OTHER,
};
const normalizeQueue = (category) => {
    const value = String(category || 'OTHER').toUpperCase();
    if (['IT', 'HR', 'FINANCE', 'MARKETING'].includes(value))
        return value;
    if (['FACILITY', 'FACILITIES', 'MAINTENANCE', 'OPERATIONS'].includes(value))
        return 'FACILITIES';
    return 'OTHER';
};
const addBusinessMinutes = (start, minutes) => {
    const result = new Date(start);
    const moveToBusinessWindow = () => {
        while (result.getDay() === 0 || result.getDay() === 6) {
            result.setDate(result.getDate() + 1);
            result.setHours(9, 0, 0, 0);
        }
        if (result.getHours() < 9)
            result.setHours(9, 0, 0, 0);
        if (result.getHours() >= 17) {
            result.setDate(result.getDate() + 1);
            result.setHours(9, 0, 0, 0);
            moveToBusinessWindow();
        }
    };
    moveToBusinessWindow();
    let remaining = Math.max(0, Math.ceil(minutes));
    while (remaining > 0) {
        moveToBusinessWindow();
        const endOfDay = new Date(result);
        endOfDay.setHours(17, 0, 0, 0);
        const available = Math.max(0, Math.floor((endOfDay.getTime() - result.getTime()) / 60000));
        if (remaining <= available) {
            result.setMinutes(result.getMinutes() + remaining);
            remaining = 0;
            break;
        }
        remaining -= available;
        result.setDate(result.getDate() + 1);
        result.setHours(9, 0, 0, 0);
    }
    return result;
};
exports.addBusinessMinutes = addBusinessMinutes;
const addBusinessHours = (start, hours) => (0, exports.addBusinessMinutes)(start, hours * 60);
exports.addBusinessHours = addBusinessHours;
const businessMinutesBetween = (start, end) => {
    if (end <= start)
        return 0;
    let totalMs = 0;
    const day = new Date(start);
    day.setHours(0, 0, 0, 0);
    const finalDay = new Date(end);
    finalDay.setHours(0, 0, 0, 0);
    while (day <= finalDay) {
        if (day.getDay() !== 0 && day.getDay() !== 6) {
            const windowStart = new Date(day);
            windowStart.setHours(9, 0, 0, 0);
            const windowEnd = new Date(day);
            windowEnd.setHours(17, 0, 0, 0);
            const overlapStart = Math.max(start.getTime(), windowStart.getTime());
            const overlapEnd = Math.min(end.getTime(), windowEnd.getTime());
            if (overlapEnd > overlapStart)
                totalMs += overlapEnd - overlapStart;
        }
        day.setDate(day.getDate() + 1);
    }
    return Math.ceil(totalMs / 60000);
};
exports.businessMinutesBetween = businessMinutesBetween;
const slaHours = { URGENT: 4, HIGH: 8, NORMAL: 24, LOW: 40 };
const managedQueues = async (userId) => {
    const queues = [];
    for (const [queue, permission] of Object.entries(queuePermissions)) {
        if ((await policy_service_1.PolicyService.evaluatePolicy(userId, permission)).allowed)
            queues.push(queue);
    }
    return queues;
};
const canAccessTicket = async (ticket, userId) => {
    if (ticket.employeeId === userId || ticket.assignedToId === userId)
        return true;
    const permission = queuePermissions[ticket.queue];
    return permission ? (await policy_service_1.PolicyService.evaluatePolicy(userId, permission)).allowed : false;
};
/**
 * SUPPORT & HELPDESK CONTROLLER
 */
const createTicket = async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const employeeId = req.user?.id;
        const queue = normalizeQueue(category);
        const normalizedPriority = String(priority || 'NORMAL').toUpperCase();
        if (!subject?.trim() || !description?.trim())
            return res.status(400).json({ error: 'Subject and description are required' });
        if (!Object.prototype.hasOwnProperty.call(slaHours, normalizedPriority)) {
            return res.status(400).json({ error: 'Priority must be URGENT, HIGH, NORMAL, or LOW' });
        }
        const ticket = await client_1.default.supportTicket.create({
            data: {
                organizationId,
                subject,
                description,
                category: category || queue,
                queue,
                priority: normalizedPriority,
                status: 'OPEN',
                employeeId,
                slaDueAt: (0, exports.addBusinessHours)(new Date(), slaHours[normalizedPriority] || slaHours.NORMAL),
            }
        });
        await client_1.default.ticketActivity.create({
            data: { organizationId, ticketId: ticket.id, actorId: employeeId, action: 'CREATED', metadata: { queue, priority: normalizedPriority } },
        });
        await (0, audit_service_1.logAction)(employeeId, 'CREATE_SUPPORT_TICKET', 'SupportTicket', ticket.id, { category, priority }, req.ip);
        const roleByQueue = {
            IT: ['IT_MANAGER', 'IT_ADMIN'], HR: ['HR_DIRECTOR', 'HR_MANAGER'], FINANCE: ['FINANCE_MANAGER'],
            MARKETING: ['MARKETING_HEAD'], FACILITIES: ['DIRECTOR'], OTHER: ['DIRECTOR'],
        };
        const queueOwners = await client_1.default.user.findMany({
            where: { organizationId, role: { in: roleByQueue[queue] || [] } },
            select: { id: true }
        });
        for (const admin of queueOwners) {
            await (0, websocket_service_1.notify)(admin.id, 'New Support Ticket 🎫', `[${category}] ${subject}`, 'WARNING', `/support/tickets/${ticket.id}`);
        }
        res.status(201).json(ticket);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.createTicket = createTicket;
const getMyTickets = async (req, res) => {
    try {
        const employeeId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const { tab } = req.query;
        const tabFilter = tab === 'open' ? { status: { in: ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'REOPENED'] } }
            : tab === 'waiting' ? { status: 'WAITING_REQUESTER' }
                : tab === 'resolved' ? { status: 'RESOLVED' }
                    : tab === 'closed' ? { status: 'CLOSED' }
                        : {};
        const tickets = await client_1.default.supportTicket.findMany({
            where: { employeeId, organizationId, ...tabFilter },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getMyTickets = getMyTickets;
const getAllTickets = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const { status, category, tab } = req.query;
        const userId = req.user?.id;
        const queues = await managedQueues(userId);
        if (!queues.length)
            return res.status(403).json({ error: 'No help-desk queue is assigned to this account.' });
        const tabFilter = tab === 'unassigned' ? { assignedToId: null }
            : tab === 'mine' ? { assignedToId: userId }
                : tab === 'waiting-requester' ? { status: 'WAITING_REQUESTER' }
                    : tab === 'sla-breaches' ? { slaDueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } }
                        : tab === 'resolved' ? { status: 'RESOLVED' }
                            : {};
        const tickets = await client_1.default.supportTicket.findMany({
            where: {
                organizationId,
                queue: { in: queues },
                ...tabFilter,
                ...(status ? { status: status } : {}),
                ...(category ? { queue: normalizeQueue(category) } : {})
            },
            include: {
                employee: { select: { fullName: true, departmentObj: { select: { name: true } } } },
                assignedTo: { select: { fullName: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getAllTickets = getAllTickets;
const getTicketDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const userId = req.user?.id;
        const ticket = await client_1.default.supportTicket.findFirst({
            where: { id, organizationId },
            include: {
                employee: { select: { fullName: true, email: true, avatarUrl: true } },
                assignedTo: { select: { fullName: true, email: true } },
                comments: {
                    include: { user: { select: { fullName: true, avatarUrl: true, role: true } } },
                    orderBy: { createdAt: 'asc' }
                },
                activities: { orderBy: { createdAt: 'asc' } },
            }
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        if (!(await canAccessTicket(ticket, userId)))
            return res.status(403).json({ error: 'Access denied' });
        const isRequester = ticket.employeeId === userId;
        res.json({ ...ticket, comments: isRequester ? ticket.comments.filter((comment) => !comment.isInternal) : ticket.comments });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getTicketDetails = getTicketDetails;
const addComment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, attachmentUrl, isInternal } = req.body;
        const userId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const ticket = await client_1.default.supportTicket.findFirst({ where: { id: ticketId, organizationId } });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        if (!(await canAccessTicket(ticket, userId)))
            return res.status(403).json({ error: 'Access denied' });
        if (isInternal && ticket.employeeId === userId)
            return res.status(403).json({ error: 'Requesters cannot create internal notes' });
        if (!content?.trim())
            return res.status(400).json({ error: 'Comment is required' });
        const comment = await client_1.default.ticketComment.create({
            data: {
                organizationId,
                ticketId,
                userId,
                content,
                attachmentUrl,
                isInternal: Boolean(isInternal),
            }
        });
        const requesterResumed = ticket.employeeId === userId && ticket.status === 'WAITING_REQUESTER' && ticket.slaPausedAt;
        const pausedBusinessMinutes = requesterResumed
            ? (0, exports.businessMinutesBetween)(ticket.slaPausedAt, new Date())
            : 0;
        await client_1.default.supportTicket.update({
            where: { id: ticketId },
            data: {
                updatedAt: new Date(),
                ...(ticket.firstResponseAt || ticket.employeeId === userId ? {} : { firstResponseAt: new Date() }),
                ...(requesterResumed ? {
                    status: 'IN_PROGRESS',
                    slaPausedAt: null,
                    slaPausedMinutes: ticket.slaPausedMinutes + pausedBusinessMinutes,
                    slaDueAt: ticket.slaDueAt ? (0, exports.addBusinessMinutes)(ticket.slaDueAt, pausedBusinessMinutes) : null,
                } : {}),
            }
        });
        if (requesterResumed) {
            await client_1.default.ticketActivity.create({
                data: { organizationId, ticketId, actorId: userId, action: 'REQUESTER_REPLIED', metadata: { resumedSlaMinutes: pausedBusinessMinutes } },
            });
        }
        res.status(201).json(comment);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.addComment = addComment;
const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedToId, resolutionSummary } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const actorId = req.user?.id;
        const current = await client_1.default.supportTicket.findFirst({ where: { id, organizationId } });
        if (!current)
            return res.status(404).json({ error: 'Ticket not found' });
        if (!(await canAccessTicket(current, actorId)))
            return res.status(403).json({ error: 'Access denied' });
        const transitions = {
            OPEN: ['TRIAGED', 'IN_PROGRESS', 'CLOSED'], TRIAGED: ['IN_PROGRESS', 'WAITING_REQUESTER', 'RESOLVED'],
            IN_PROGRESS: ['WAITING_REQUESTER', 'RESOLVED'], WAITING_REQUESTER: ['IN_PROGRESS', 'RESOLVED'],
            RESOLVED: ['CLOSED', 'REOPENED'], REOPENED: ['TRIAGED', 'IN_PROGRESS', 'WAITING_REQUESTER', 'RESOLVED'], CLOSED: ['REOPENED'],
        };
        if (status && !transitions[current.status]?.includes(status)) {
            return res.status(409).json({ error: `Invalid ticket transition from ${current.status} to ${status}` });
        }
        if (status === 'RESOLVED' && !resolutionSummary?.trim())
            return res.status(400).json({ error: 'A resolution summary is required.' });
        if (assignedToId) {
            const assignee = await client_1.default.user.findFirst({ where: { id: assignedToId, organizationId }, select: { id: true } });
            if (!assignee)
                return res.status(400).json({ error: 'Assignee is not in this organization.' });
            const permission = queuePermissions[current.queue];
            if (!permission || !(await policy_service_1.PolicyService.evaluatePolicy(assignedToId, permission)).allowed) {
                return res.status(400).json({ error: 'Assignee is not authorized for this department queue.' });
            }
        }
        const data = {};
        if (status)
            data.status = status;
        if (assignedToId) {
            data.assignedToId = assignedToId;
            data.assignedAt = new Date();
        }
        if (resolutionSummary !== undefined)
            data.resolutionSummary = resolutionSummary;
        if (status === 'WAITING_REQUESTER')
            data.slaPausedAt = new Date();
        if (current.status === 'WAITING_REQUESTER' && status && status !== 'WAITING_REQUESTER' && current.slaPausedAt) {
            const pausedMinutes = (0, exports.businessMinutesBetween)(current.slaPausedAt, new Date());
            data.slaPausedMinutes = current.slaPausedMinutes + pausedMinutes;
            data.slaDueAt = current.slaDueAt ? (0, exports.addBusinessMinutes)(current.slaDueAt, pausedMinutes) : null;
            data.slaPausedAt = null;
        }
        if (status === 'RESOLVED')
            data.resolvedAt = new Date();
        if (status === 'CLOSED')
            data.closedAt = new Date();
        const ticket = await client_1.default.supportTicket.update({
            where: { id },
            data
        });
        await client_1.default.ticketActivity.create({
            data: { organizationId, ticketId: ticket.id, actorId, action: status ? `STATUS_${status}` : 'ASSIGNED', metadata: { assignedToId, resolutionSummary } },
        });
        // Notify employee if status changed
        if (status) {
            await (0, websocket_service_1.notify)(ticket.employeeId, 'Ticket Updated 🎫', `Your ticket status is now: ${status}`, 'INFO', `/support/tickets/${id}`);
        }
        res.json(ticket);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateTicketStatus = updateTicketStatus;
const reopenTicket = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const userId = req.user?.id;
        const ticket = await client_1.default.supportTicket.findFirst({ where: { id: req.params.id, organizationId, employeeId: userId } });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        if (!['RESOLVED', 'CLOSED'].includes(ticket.status))
            return res.status(409).json({ error: 'Only resolved or closed tickets can be reopened' });
        const updated = await client_1.default.supportTicket.update({
            where: { id: ticket.id },
            data: {
                status: 'REOPENED', resolvedAt: null, closedAt: null, resolutionSummary: null,
                slaPausedAt: null, slaPausedMinutes: 0,
                slaDueAt: (0, exports.addBusinessHours)(new Date(), slaHours[String(ticket.priority || 'NORMAL').toUpperCase()] || slaHours.NORMAL),
            },
        });
        await client_1.default.ticketActivity.create({
            data: { organizationId, ticketId: ticket.id, actorId: userId, action: 'STATUS_REOPENED' },
        });
        return res.json(updated);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.reopenTicket = reopenTicket;
const getQueueDashboard = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const queues = await managedQueues(req.user?.id);
        if (!queues.length)
            return res.status(403).json({ error: 'No help-desk queue is assigned to this account.' });
        const where = { organizationId, queue: { in: queues } };
        const [byStatus, byQueue, workload, breached, resolved] = await Promise.all([
            client_1.default.supportTicket.groupBy({ by: ['status'], where, _count: { _all: true } }),
            client_1.default.supportTicket.groupBy({ by: ['queue'], where, _count: { _all: true } }),
            client_1.default.supportTicket.groupBy({ by: ['assignedToId'], where: { ...where, status: { notIn: ['RESOLVED', 'CLOSED'] } }, _count: { _all: true } }),
            client_1.default.supportTicket.count({ where: { ...where, slaDueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
            client_1.default.supportTicket.findMany({ where: { ...where, resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true } }),
        ]);
        const assigneeIds = workload.map(item => item.assignedToId).filter((id) => Boolean(id));
        const assignees = assigneeIds.length
            ? await client_1.default.user.findMany({ where: { id: { in: assigneeIds }, organizationId }, select: { id: true, fullName: true } })
            : [];
        const names = new Map(assignees.map(person => [person.id, person.fullName]));
        const averageResolutionMinutes = resolved.length
            ? Math.round(resolved.reduce((sum, item) => sum + ((item.resolvedAt.getTime() - item.createdAt.getTime()) / 60000), 0) / resolved.length)
            : 0;
        return res.json({
            queues,
            byStatus: Object.fromEntries(byStatus.map(item => [item.status, item._count._all])),
            byQueue: Object.fromEntries(byQueue.map(item => [item.queue, item._count._all])),
            workload: workload.map(item => ({ assignedToId: item.assignedToId, name: item.assignedToId ? names.get(item.assignedToId) : 'Unassigned', count: item._count._all })),
            slaBreaches: breached,
            averageResolutionMinutes,
        });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.getQueueDashboard = getQueueDashboard;
const listKnowledgeArticles = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const userId = req.user?.id;
        const queues = await managedQueues(userId);
        const requestedQueue = req.query.queue ? normalizeQueue(String(req.query.queue)) : undefined;
        const canManageRequested = requestedQueue ? queues.includes(requestedQueue) : queues.length > 0;
        const articles = await client_1.default.knowledgeArticle.findMany({
            where: {
                organizationId,
                ...(requestedQueue ? { queue: requestedQueue } : {}),
                ...(canManageRequested ? { queue: { in: requestedQueue ? [requestedQueue] : queues } } : { status: 'PUBLISHED' }),
            },
            orderBy: { updatedAt: 'desc' },
        });
        return res.json(articles);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
exports.listKnowledgeArticles = listKnowledgeArticles;
const createKnowledgeArticle = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const userId = req.user?.id;
        const queue = normalizeQueue(req.body.queue);
        const queues = await managedQueues(userId);
        if (!queues.includes(queue))
            return res.status(403).json({ error: 'You do not manage this knowledge-base queue.' });
        if (!req.body.title?.trim() || !req.body.content?.trim())
            return res.status(400).json({ error: 'Title and content are required.' });
        const status = req.body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
        const article = await client_1.default.knowledgeArticle.create({
            data: { organizationId, queue, title: req.body.title.trim(), content: req.body.content.trim(), status, createdById: userId },
        });
        return res.status(201).json(article);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
exports.createKnowledgeArticle = createKnowledgeArticle;
/**
 * LEAD GENERATION (Public Landing Page)
 */
const createLead = async (req, res) => {
    try {
        const { name, email, company, phone, subject, message } = req.body;
        const lead = await client_1.default.lead.create({
            data: {
                name,
                email,
                company,
                phone,
                subject,
                message,
                status: 'NEW'
            }
        });
        // Notify NOC Operators if possible
        console.log(`[Lead] New Inquiry Captured: ${email} for ${company || 'Unknown'}`);
        res.status(201).json({ success: true, leadId: lead.id });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.createLead = createLead;
const getLeads = async (req, res) => {
    try {
        const leads = await client_1.default.lead.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(leads);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getLeads = getLeads;
