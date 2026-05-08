"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQueryStatus = exports.createQuery = exports.getEmployeeQueries = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getEmployeeQueries = async (req, res) => {
    try {
        const queries = await client_1.default.employeeQuery.findMany({
            where: { employeeId: req.params.id },
            include: { issuedBy: { select: { fullName: true, role: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(queries);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch queries' });
    }
};
exports.getEmployeeQueries = getEmployeeQueries;
const createQuery = async (req, res) => {
    try {
        const { subject, description } = req.body;
        if (!subject || !description)
            return res.status(400).json({ error: 'Missing required fields' });
        const query = await client_1.default.employeeQuery.create({
            data: {
                employeeId: req.params.id,
                // @ts-ignore
                issuedById: req.user.id,
                subject,
                description
            },
            include: { issuedBy: { select: { fullName: true, role: true } } }
        });
        res.json(query);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to issue query' });
    }
};
exports.createQuery = createQuery;
const updateQueryStatus = async (req, res) => {
    try {
        const { status, resolution } = req.body;
        const query = await client_1.default.employeeQuery.update({
            where: { id: req.params.id },
            data: { status, resolution },
            include: { issuedBy: { select: { fullName: true, role: true } } }
        });
        res.json(query);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update query' });
    }
};
exports.updateQueryStatus = updateQueryStatus;
