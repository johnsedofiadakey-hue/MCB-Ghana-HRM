"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerWebhook = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../prisma/client"));
const triggerWebhook = async (organizationId, event, payload) => {
    try {
        // Find all active subscriptions for this organization that listen to this event
        const subscriptions = await client_1.default.webhookSubscription.findMany({
            where: {
                organizationId,
                isActive: true,
                events: { contains: event } // Event string search
            }
        });
        if (subscriptions.length === 0)
            return;
        console.log(`[Webhook Service] Triggering ${event} for ${subscriptions.length} endpoints (Org: ${organizationId})`);
        const requestPayload = JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload
        });
        // Fire all webhooks asynchronously
        subscriptions.forEach(async (sub) => {
            try {
                const headers = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'MCB-HR-Platform-Webhooks/1.0'
                };
                // Add HMAC signature if a secret is configured
                if (sub.secret) {
                    const signature = crypto_1.default.createHmac('sha256', sub.secret).update(requestPayload).digest('hex');
                    headers['X-MCB-Signature'] = `sha256=${signature}`;
                }
                await axios_1.default.post(sub.url, requestPayload, { headers });
            }
            catch (err) {
                console.error(`[Webhook Service] Delivery failed for ${sub.url}:`, err.message);
            }
        });
    }
    catch (e) {
        console.error('[Webhook Service] Error checking subscriptions:', e.message);
    }
};
exports.triggerWebhook = triggerWebhook;
