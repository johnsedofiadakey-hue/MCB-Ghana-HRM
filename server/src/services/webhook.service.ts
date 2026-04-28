import axios from 'axios';
import crypto from 'crypto';
import prisma from '../prisma/client';

export type WebhookEvent = 'EMPLOYEE_CREATED' | 'EMPLOYEE_TERMINATED' | 'LEAVE_APPROVED' | 'PAYROLL_RUN_COMPLETED' | 'APPRAISAL_COMPLETED';

export const triggerWebhook = async (organizationId: string, event: WebhookEvent, payload: any) => {
    try {
        // Find all active subscriptions for this organization that listen to this event
        const subscriptions = await prisma.webhookSubscription.findMany({
            where: {
                organizationId,
                isActive: true,
                events: { contains: event } // Event string search
            }
        });

        if (subscriptions.length === 0) return;

        console.log(`[Webhook Service] Triggering ${event} for ${subscriptions.length} endpoints (Org: ${organizationId})`);

        const requestPayload = JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload
        });

        // Fire all webhooks asynchronously
        subscriptions.forEach(async (sub) => {
            try {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'MCB-HR-Platform-Webhooks/1.0'
                };

                // Add HMAC signature if a secret is configured
                if (sub.secret) {
                    const signature = crypto.createHmac('sha256', sub.secret).update(requestPayload).digest('hex');
                    headers['X-MCB-Signature'] = `sha256=${signature}`;
                }

                await axios.post(sub.url, requestPayload, { headers });

            } catch (err: any) {
                console.error(`[Webhook Service] Delivery failed for ${sub.url}:`, err.message);
            }
        });
    } catch (e: any) {
        console.error('[Webhook Service] Error checking subscriptions:', e.message);
    }
};
