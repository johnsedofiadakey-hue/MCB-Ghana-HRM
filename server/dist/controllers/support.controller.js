"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeads = exports.createLead = exports.updateTicketStatus = exports.addComment = exports.getTicketDetails = exports.getAllTickets = exports.getMyTickets = exports.createTicket = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
/**
 * SUPPORT & HELPDESK CONTROLLER
 */
const createTicket = async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const employeeId = req.user?.id;
        const ticket = await client_1.default.supportTicket.create({
            data: {
                organizationId,
                subject,
                description,
                category,
                priority: priority || 'NORMAL',
                status: 'OPEN',
                employeeId
            }
        });
        await (0, audit_service_1.logAction)(employeeId, 'CREATE_SUPPORT_TICKET', 'SupportTicket', ticket.id, { category, priority }, req.ip);
        // Notify IT Admins
        const itAdmins = await client_1.default.user.findMany({
            where: { role: 'IT_ADMIN' },
            select: { id: true }
        });
        for (const admin of itAdmins) {
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
        const tickets = await client_1.default.supportTicket.findMany({
            where: { employeeId, organizationId },
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
        const { status, category } = req.query;
        const tickets = await client_1.default.supportTicket.findMany({
            where: {
                organizationId,
                ...(status ? { status: status } : {}),
                ...(category ? { category: category } : {})
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
        const ticket = await client_1.default.supportTicket.findUnique({
            where: { id },
            include: {
                employee: { select: { fullName: true, email: true, avatarUrl: true } },
                assignedTo: { select: { fullName: true, email: true } },
                comments: {
                    include: { user: { select: { fullName: true, avatarUrl: true, role: true } } },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
        if (!ticket)
            return res.status(404).json({ error: 'Ticket not found' });
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getTicketDetails = getTicketDetails;
const addComment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { content, attachmentUrl } = req.body;
        const userId = req.user?.id;
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const comment = await client_1.default.ticketComment.create({
            data: {
                organizationId,
                ticketId,
                userId,
                content,
                attachmentUrl
            }
        });
        // Update ticket updatedAt
        await client_1.default.supportTicket.update({
            where: { id: ticketId },
            data: { updatedAt: new Date() }
        });
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
        const { status, assignedToId } = req.body;
        const data = {};
        if (status)
            data.status = status;
        if (assignedToId)
            data.assignedToId = assignedToId;
        const ticket = await client_1.default.supportTicket.update({
            where: { id },
            data
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
