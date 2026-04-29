"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReceipt = exports.getPaymentStatus = exports.manualBillingOverride = exports.handleWebhook = exports.initializePayment = void 0;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const client_1 = __importDefault(require("../prisma/client"));
const receipt_service_1 = require("../services/receipt.service");
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const initializePayment = async (req, res) => {
    try {
        const { plan } = req.body; // 'MONTHLY' or 'ANNUALLY'
        const userReq = req.user;
        // Fetch global master config for Paystack keys
        const masterSettings = await client_1.default.systemSettings.findFirst({
            where: { organizationId: 'mcb-ghana-tenant' }
        });
        const secretKey = masterSettings?.paystackSecretKey || PAYSTACK_SECRET;
        if (!secretKey) {
            return res.status(500).json({ error: 'Paystack is not configured on the platform.' });
        }
        const org = await client_1.default.organization.findUnique({
            where: { id: userReq.organizationId },
            select: { discountPercentage: true, discountFixed: true }
        });
        // FIXED PRODUCTION PRICING (USD) - Direct Payment to Platform
        let amount = plan === 'ANNUALLY' ? 3500 : 450;
        if (org?.discountPercentage) {
            amount = Number(amount) * (1 - Number(org.discountPercentage) / 100);
        }
        if (org?.discountFixed) {
            amount = Math.max(0, Number(amount) - Number(org.discountFixed));
        }
        const response = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
            email: userReq.email || 'billing@mcb-ghana-hrm.com',
            amount: Math.round(Number(amount) * 100), // In pesewas
            callback_url: `${process.env.FRONTEND_URL}/billing/callback`,
            metadata: {
                organizationId: userReq.organizationId,
                plan: plan,
                userId: userReq.id
            }
        }, {
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    }
    catch (error) {
        console.error('[Paystack Init] Error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to initialize payment' });
    }
};
exports.initializePayment = initializePayment;
const handleWebhook = async (req, res) => {
    try {
        // 1. Verify Paystack signature
        const secret = PAYSTACK_SECRET || '';
        const hash = crypto_1.default.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
        if (hash !== req.headers['x-paystack-signature']) {
            console.warn('[Webhook] Unauthorized: Invalid Paystack signature');
            return res.sendStatus(401);
        }
        const event = req.body;
        if (event.event === 'charge.success') {
            const { metadata, reference } = event.data;
            const { organizationId, plan } = metadata;
            await client_1.default.organization.update({
                where: { id: organizationId },
                data: {
                    billingStatus: 'ACTIVE',
                    subscriptionPlan: plan === 'ANNUALLY' ? 'ENTERPRISE' : 'PRO',
                    nextBillingDate: new Date(Date.now() + (plan === 'ANNUALLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
                }
            });
            // Create a subscription record for history
            await client_1.default.subscription.create({
                data: {
                    organizationId,
                    clientId: metadata.userId,
                    plan: plan,
                    priceGHS: event.data.amount / 100,
                    status: 'ACTIVE',
                    paystackRef: reference,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + (plan === 'ANNUALLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
                }
            });
        }
        res.sendStatus(200);
    }
    catch (err) {
        console.error('[Webhook] Error:', err.message);
        res.sendStatus(200); // Always 200 to Paystack to prevent retries
    }
};
exports.handleWebhook = handleWebhook;
const manualBillingOverride = async (req, res) => {
    try {
        const { organizationId, plan, type } = req.body;
        await client_1.default.organization.update({
            where: { id: organizationId },
            data: {
                billingStatus: 'ACTIVE',
                subscriptionPlan: plan || 'PRO',
                nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default to 1 year for manual
            }
        });
        res.json({ message: 'Billing overridden successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.manualBillingOverride = manualBillingOverride;
const getPaymentStatus = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const [org, settings, masterSettings] = await Promise.all([
            client_1.default.organization.findUnique({
                where: { id: organizationId },
                select: {
                    subscriptionPlan: true,
                    billingStatus: true,
                    trialEndsAt: true,
                    nextBillingDate: true,
                    isSuspended: true,
                    discountPercentage: true,
                    discountFixed: true
                }
            }),
            client_1.default.systemSettings.findFirst({
                where: { organizationId },
                select: {
                    monthlyPriceGHS: true,
                    annualPriceGHS: true,
                    currency: true,
                    monthlyPrice: true,
                    annualPrice: true,
                    paystackPublicKey: true
                }
            }),
            client_1.default.systemSettings.findFirst({
                where: { organizationId: 'mcb-ghana-tenant' }
            })
        ]);
        if (!org) {
            console.warn(`[PaymentStatus] Organization not found: ${organizationId}`);
            return res.status(404).json({ error: 'Organization not found' });
        }
        // Fetch latest subscription record for history
        const history = await client_1.default.subscription.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 5
        }).catch(err => {
            console.error('[PaymentStatus] Subscription fetch failed:', err.message);
            return [];
        });
        res.json({
            plan: org.subscriptionPlan,
            status: org.billingStatus,
            isSuspended: org.isSuspended,
            trialEndsAt: org.trialEndsAt,
            nextBillingDate: org.nextBillingDate,
            monthlyPrice: Number(settings?.monthlyPrice || masterSettings?.monthlyPrice || 300),
            annualPrice: Number(settings?.annualPrice || masterSettings?.annualPrice || 3000),
            currency: settings?.currency || masterSettings?.currency || 'GHS',
            discountPercentage: org.discountPercentage || 0,
            discountFixed: org.discountFixed || 0,
            paystackConfigured: !!(settings?.paystackPublicKey || masterSettings?.paystackPublicKey),
            paystackPayLink: masterSettings?.paystackPayLink,
            trialDays: masterSettings?.trialDays || 14,
            history
        });
    }
    catch (error) {
        console.error('[PaymentStatus] Fatal Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};
exports.getPaymentStatus = getPaymentStatus;
const downloadReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        await receipt_service_1.ReceiptService.generateSubscriptionReceipt(id, orgId || 'mcb-ghana-tenant', res);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.downloadReceipt = downloadReceipt;
