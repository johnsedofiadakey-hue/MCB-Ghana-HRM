"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSystemAction = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const logSystemAction = async (params) => {
    try {
        await client_1.default.systemLog.create({
            data: {
                action: params.action,
                details: params.details,
                operatorId: params.operatorId,
                operatorEmail: params.operatorEmail,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
            },
        });
    }
    catch (error) {
        console.error('Failed to log system action:', error);
    }
};
exports.logSystemAction = logSystemAction;
