"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = void 0;
const axios_1 = __importDefault(require("axios"));
// ============================================================================
// HUBTEL SMS SERVICE INTEGRATION
// ============================================================================
// To activate this service, you must provide your Hubtel API keys in your .env:
// HUBTEL_CLIENT_ID=your_client_id
// HUBTEL_CLIENT_SECRET=your_client_secret
// HUBTEL_SENDER_ID=NEXUS_HRM  (Max 11 characters)
const HUBTEL_API_URL = 'https://smsc.hubtel.com/v1/messages/send';
const IS_PROD = process.env.NODE_ENV === 'production';
const sendSMS = async ({ to, message }) => {
    const clientId = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    const senderId = process.env.HUBTEL_SENDER_ID || 'HRM_HUB';
    // Format phone number: remove any characters that aren't digits or '+'
    const formattedPhone = to.replace(/[^0-9+]/g, '');
    if (!formattedPhone) {
        console.warn('[SMS Service] Invalid or missing phone number:', to);
        return false;
    }
    // 1. In Development/Stub Mode, log the SMS and skip real HTTP request
    if (!clientId || !clientSecret) {
        console.log(`\n================= HUBTEL SMS SIMULATION =================\nTO: ${formattedPhone}\nSENDER: ${senderId}\nMESSAGE:\n${message}\n=========================================================\n`);
        return true; // Pretend it succeeded
    }
    // 2. Production Mode Output
    try {
        const response = await axios_1.default.get(HUBTEL_API_URL, {
            params: {
                clientid: clientId,
                clientsecret: clientSecret,
                from: senderId,
                to: formattedPhone,
                content: message
            }
        });
        if (response.status === 200 || response.status === 201) {
            console.log(`[SMS Service] Successfully dispatched SMS to ${formattedPhone}`);
            return true;
        }
        else {
            console.error(`[SMS Service] Failed to send SMS to ${formattedPhone}. Status: ${response.status}`);
            return false;
        }
    }
    catch (error) {
        console.error(`[SMS Service] Exception while sending SMS to ${formattedPhone}:`, error?.response?.data || error.message);
        return false;
    }
};
exports.sendSMS = sendSMS;
