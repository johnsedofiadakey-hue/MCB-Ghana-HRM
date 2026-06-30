"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHistoryStatus = exports.getHistoryByEmployee = exports.getHistoryById = exports.createHistory = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const createHistory = async (data) => {
    const employee = await client_1.default.user.findFirst({
        where: { id: data.employeeId, organizationId: data.organizationId },
        select: { id: true }
    });
    if (!employee)
        throw new Error('Employee not found in this organization');
    return client_1.default.employeeHistory.create({
        data: {
            organizationId: data.organizationId,
            employeeId: data.employeeId,
            loggedById: data.loggedById,
            type: data.type,
            title: data.title,
            description: data.description,
            change: data.description || data.title,
            severity: data.severity || 'LOW',
            status: data.status || 'OPEN'
        },
        include: { loggedBy: { select: { fullName: true, jobTitle: true } } }
    });
};
exports.createHistory = createHistory;
const getHistoryById = async (organizationId, id) => {
    return client_1.default.employeeHistory.findFirst({
        where: { id, organizationId },
        select: { id: true, employeeId: true, status: true }
    });
};
exports.getHistoryById = getHistoryById;
const getHistoryByEmployee = async (organizationId, employeeId) => {
    return client_1.default.employeeHistory.findMany({
        where: { employeeId, organizationId },
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { fullName: true, id: true } } }
    });
};
exports.getHistoryByEmployee = getHistoryByEmployee;
const updateHistoryStatus = async (organizationId, id, status) => {
    const record = await (0, exports.getHistoryById)(organizationId, id);
    if (!record)
        throw new Error('Employee history record not found');
    return client_1.default.employeeHistory.update({ where: { id: record.id }, data: { status } });
};
exports.updateHistoryStatus = updateHistoryStatus;
