"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCycle = exports.updateCycle = exports.getCycleById = exports.getCycles = exports.createCycle = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const createCycle = async (organizationId, data) => {
    return client_1.default.cycle.create({
        data: {
            organizationId,
            name: data.name,
            type: data.type,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            status: 'DRAFT',
        },
    });
};
exports.createCycle = createCycle;
const getCycles = async (organizationId, filter) => {
    return client_1.default.cycle.findMany({
        where: { ...filter, organizationId },
        orderBy: { startDate: 'desc' },
    });
};
exports.getCycles = getCycles;
const getCycleById = async (organizationId, id) => {
    return client_1.default.cycle.findFirst({
        where: { id, organizationId },
    });
};
exports.getCycleById = getCycleById;
const updateCycle = async (organizationId, id, data) => {
    const updateData = { ...data };
    if (data.startDate)
        updateData.startDate = new Date(data.startDate);
    if (data.endDate)
        updateData.endDate = new Date(data.endDate);
    return client_1.default.cycle.updateMany({
        where: { id, organizationId },
        data: updateData,
    });
};
exports.updateCycle = updateCycle;
const deleteCycle = async (organizationId, id) => {
    return client_1.default.cycle.deleteMany({ where: { id, organizationId } });
};
exports.deleteCycle = deleteCycle;
