"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmployeeConnections = exports.submitConnection = exports.getPublicCallCard = exports.getCallCardByEmployee = exports.upsertCallCard = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const enterprise_controller_1 = require("./enterprise.controller");
const upsertCallCard = async (req, res) => {
    try {
        const orgId = (0, enterprise_controller_1.getOrgId)(req);
        const { employeeId, fullName, jobTitle, department, bio, email, phone, whatsapp, linkedin, github, website, theme, logoUrl, isActive } = req.body;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }
        if (!fullName?.trim() || !jobTitle?.trim() || !email?.trim()) {
            return res.status(400).json({ error: 'Full Name, Job Title, and Email are required fields' });
        }
        const card = await client_1.default.callCard.upsert({
            where: { employeeId },
            update: {
                fullName: fullName.trim(),
                jobTitle: jobTitle.trim(),
                department: department?.trim() || null,
                bio: bio?.trim() || '',
                email: email.trim(),
                phone: phone?.trim() || '',
                whatsapp: whatsapp?.trim() || '',
                linkedin: linkedin?.trim() || '',
                github: github?.trim() || '',
                website: website?.trim() || '',
                theme: theme || 'MCB_GOLD',
                logoUrl: logoUrl || '',
                isActive: isActive !== undefined ? isActive : true
            },
            create: {
                employeeId,
                organizationId: orgId || 'mcb-ghana-tenant',
                fullName: fullName.trim(),
                jobTitle: jobTitle.trim(),
                department: department?.trim() || null,
                bio: bio?.trim() || '',
                email: email.trim(),
                phone: phone?.trim() || '',
                whatsapp: whatsapp?.trim() || '',
                linkedin: linkedin?.trim() || '',
                github: github?.trim() || '',
                website: website?.trim() || '',
                theme: theme || 'MCB_GOLD',
                logoUrl: logoUrl || '',
                isActive: isActive !== undefined ? isActive : true
            }
        });
        console.log(`[CallCard] Successfully configured card for Employee ID ${employeeId} with theme ${theme}`);
        res.status(200).json(card);
    }
    catch (error) {
        console.error('[CallCard] Upsert error:', error);
        res.status(500).json({ error: error.message || 'Failed to update Call Card' });
    }
};
exports.upsertCallCard = upsertCallCard;
const getCallCardByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        if (!employeeId) {
            return res.status(400).json({ error: 'Employee ID is required' });
        }
        const card = await client_1.default.callCard.findUnique({
            where: { employeeId }
        });
        if (card) {
            return res.json(card);
        }
        // Default template derived from active user database context
        const user = await client_1.default.user.findUnique({
            where: { id: employeeId },
            include: { departmentObj: { select: { name: true } } }
        });
        if (!user) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const defaultCard = {
            employeeId,
            fullName: user.fullName || '',
            jobTitle: user.jobTitle || '',
            department: user.departmentObj?.name || '',
            bio: '',
            email: user.email || '',
            phone: user.contactNumber || '',
            whatsapp: '',
            linkedin: '',
            github: '',
            website: '',
            theme: 'MCB_GOLD',
            logoUrl: '',
            isActive: true,
            isNew: true
        };
        res.json(defaultCard);
    }
    catch (error) {
        console.error('[CallCard] Retrieve employee error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch Call Card settings' });
    }
};
exports.getCallCardByEmployee = getCallCardByEmployee;
const getPublicCallCard = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Card ID is required' });
        }
        // Increment scan impressions (views) on every active card fetch
        const card = await client_1.default.callCard.update({
            where: { id },
            data: { views: { increment: 1 } },
            include: {
                employee: {
                    select: {
                        avatarUrl: true,
                        status: true
                    }
                }
            }
        });
        if (!card) {
            return res.status(404).json({ error: 'Call Card not found or has been removed.' });
        }
        if (!card.isActive) {
            return res.status(403).json({ error: 'This digital call card is currently suspended by management.' });
        }
        res.json(card);
    }
    catch (error) {
        console.error('[CallCard] Public retrieval error:', error);
        res.status(500).json({ error: error.message || 'Failed to scan public Call Card' });
    }
};
exports.getPublicCallCard = getPublicCallCard;
const submitConnection = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, phone, company, notes } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'Card ID is required' });
        }
        if (!fullName?.trim() || !email?.trim()) {
            return res.status(400).json({ error: 'Full Name and Email are required to connect' });
        }
        const card = await client_1.default.callCard.findUnique({
            where: { id }
        });
        if (!card) {
            return res.status(404).json({ error: 'Call Card not found.' });
        }
        const connection = await client_1.default.callCardConnection.create({
            data: {
                callCardId: id,
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone?.trim() || '',
                company: company?.trim() || '',
                notes: notes?.trim() || ''
            }
        });
        res.status(201).json({ message: 'Connection submitted successfully', connection });
    }
    catch (error) {
        console.error('[CallCard] Submit connection error:', error);
        res.status(500).json({ error: error.message || 'Failed to exchange contacts.' });
    }
};
exports.submitConnection = submitConnection;
const getEmployeeConnections = async (req, res) => {
    try {
        const employeeId = req.user?.id;
        if (!employeeId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const card = await client_1.default.callCard.findUnique({
            where: { employeeId },
            include: {
                connections: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!card) {
            return res.json({ views: 0, connections: [] });
        }
        res.json({
            views: card.views,
            connections: card.connections
        });
    }
    catch (error) {
        console.error('[CallCard] Get employee connections error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch connection logs' });
    }
};
exports.getEmployeeConnections = getEmployeeConnections;
