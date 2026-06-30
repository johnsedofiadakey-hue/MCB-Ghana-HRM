"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeOnboardingTasksForEvent = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const completeOnboardingTasksForEvent = async (params) => {
    const { organizationId, employeeId, event, actorId, evidenceUrl } = params;
    const items = await client_1.default.onboardingItem.findMany({
        where: {
            organizationId,
            autoCompleteEvent: event,
            status: { notIn: ['COMPLETED', 'VERIFIED'] },
            session: { employeeId },
        },
        select: { id: true, sessionId: true },
    });
    if (!items.length)
        return 0;
    await client_1.default.onboardingItem.updateMany({
        where: { id: { in: items.map((item) => item.id) }, organizationId },
        data: { status: 'COMPLETED', completedAt: new Date(), completedBy: actorId, evidenceUrl },
    });
    return items.length;
};
exports.completeOnboardingTasksForEvent = completeOnboardingTasksForEvent;
