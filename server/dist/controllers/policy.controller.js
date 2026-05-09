"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyController = void 0;
const policy_service_1 = require("../services/policy.service");
class PolicyController {
    static async simulate(req, res) {
        try {
            const { userId, permission, context } = req.body;
            if (!userId || !permission) {
                return res.status(400).json({ error: 'userId and permission are required' });
            }
            const result = await policy_service_1.PolicyService.evaluatePolicy(userId, permission, context || {});
            return res.json({
                userId,
                permission,
                allowed: result.allowed,
                reason: result.reason,
            });
        }
        catch (error) {
            console.error('[Policy Controller] Simulation Error:', error);
            return res.status(500).json({ error: 'Internal server error during simulation' });
        }
    }
}
exports.PolicyController = PolicyController;
