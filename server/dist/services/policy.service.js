"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const permissions_1 = require("../types/permissions");
class PolicyService {
    static async getEffectivePermissions(userId) {
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            select: { role: true, organizationId: true, permissionBundles: { select: { organizationId: true, permissions: true } } },
        });
        if (!user)
            return [];
        if (String(user.role).toUpperCase() === 'DEV')
            return ['*'];
        const bundlePermissions = user.permissionBundles
            .filter((bundle) => bundle.organizationId === user.organizationId)
            .flatMap((bundle) => bundle.permissions);
        return [...new Set([...(0, permissions_1.getRoleDefaultPermissions)(user.role), ...bundlePermissions])].sort();
    }
    /**
     * Evaluates if a user has permission to perform an action on a target.
     * @param userId The ID of the user performing the action.
     * @param permission The permission string (e.g., 'leave.approve').
     * @param context Contextual data like targetUserId, departmentId, etc.
     */
    static async evaluatePolicy(userId, permission, context = {}) {
        // 1. Get user with bundles
        const user = await client_1.default.user.findUnique({
            where: { id: userId },
            include: { permissionBundles: true },
        });
        if (!user)
            return { allowed: false, reason: 'User not found' };
        // Only the platform developer has an unrestricted system override. Business
        // roles, including MD and Directors, receive explicit permissions.
        if (String(user.role).toUpperCase() === 'DEV') {
            return { allowed: true, reason: 'System developer override' };
        }
        if ((0, permissions_1.getRoleDefaultPermissions)(user.role).includes(permission)) {
            return { allowed: true, reason: `Granted by default role bundle for ${user.role}` };
        }
        // 2. Check direct permissions from bundles
        for (const bundle of user.permissionBundles) {
            if (bundle.organizationId !== user.organizationId)
                continue;
            const hasPerm = bundle.permissions.includes(permission);
            if (hasPerm) {
                const scopeAllowed = this.evaluateScope(user, bundle.scope, context);
                if (scopeAllowed) {
                    return { allowed: true, reason: `Granted by bundle "${bundle.name}" with scope "${bundle.scope}"` };
                }
            }
        }
        // 3. Check delegations
        const activeDelegations = await client_1.default.delegation.findMany({
            where: {
                delegateId: userId,
                organizationId: user.organizationId,
                status: 'ACTIVE',
                startTime: { lte: new Date() },
                endTime: { gte: new Date() },
            },
        });
        for (const delegation of activeDelegations) {
            // Check if the granter has the permission
            const granterResult = await this.evaluatePolicy(delegation.granterId, permission, context);
            if (granterResult.allowed) {
                return {
                    allowed: true,
                    reason: `Granted via delegation from user ${delegation.granterId}. Reason for granter: ${granterResult.reason}`
                };
            }
        }
        return { allowed: false, reason: 'No matching permission bundle or active delegation found with appropriate scope' };
    }
    static evaluateScope(user, scope, context) {
        switch (scope) {
            case 'ORG':
                return true; // Org-wide access
            case 'DEPT':
                return context.departmentId === user.departmentId;
            case 'TEAM':
                return context.supervisorId === user.id;
            case 'SELF':
                return context.targetUserId === user.id;
            default:
                return false;
        }
    }
}
exports.PolicyService = PolicyService;
