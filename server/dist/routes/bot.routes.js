"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const genai_1 = require("@google/genai");
const router = (0, express_1.Router)();
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new genai_1.GoogleGenAI({ apiKey }) : null;
/**
 * SLACK / TEAMS WEBHOOK HANDLER
 * Process incoming messages from bot platforms
 */
router.post('/webhook', async (req, res) => {
    // In a real scenario, you'd verify Slack/Teams signature here
    const { message, platform, user_id, channel_id } = req.body;
    if (!message || !ai) {
        return res.status(200).send('Bot inactive or missing payload');
    }
    try {
        const prompt = `
        You are "MCB Bot", an HR Assistant. A user on ${platform} said: "${message}".
        Based on this, determine their intent.
        Intents: LEAVE_REQUEST, SALARY_INQUIRY, POLICY_QUESTION, GENERAL_CHAT.
        
        If it's a LEAVE_REQUEST, extract type and date range if possible.
        Return response in JSON: { "reply": "string", "intent": "string", "data": {} }
        `;
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text() || '{}';
        const aiResponse = JSON.parse(text);
        // Logic to actually perform actions would go here (e.g. creating a leave request draft)
        res.json({
            fulfillment: aiResponse.reply,
            platform_payload: {
                text: aiResponse.reply,
                thread_id: channel_id
            }
        });
    }
    catch (err) {
        res.status(200).json({ fulfillment: "I'm having trouble processing that right now. Please use the MCB Dashboard." });
    }
});
exports.default = router;
