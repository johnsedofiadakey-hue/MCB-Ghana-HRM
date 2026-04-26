import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getOrgId } from './enterprise.controller';
import prisma from '../prisma/client';
import { executeTool, functionDeclarations } from '../services/ai-tools.service';

/**
 * AI Controller - Nexus IQ Intelligence Layer
 * Unified handler for insights, agentic chat, and technical parsing.
 */

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const generateInsight = async (req: Request, res: Response) => {
  if (!ai) {
    return res.status(503).json({ 
      error: 'AI service unavailable.', 
      details: 'GEMINI_API_KEY is missing from environment variables. Please add it to Render dashboard.' 
    });
  }

  try {
    const { contextType, data } = req.body;
    
    // Mask sensitive PII
    const sanitizedData = { ...data };
    if (sanitizedData.bankAccountNumber) delete sanitizedData.bankAccountNumber;
    if (sanitizedData.pin) delete sanitizedData.pin;
    
    const user = (req as any).user;
    const prompt = `
You are "Cortex", the Senior HR Strategy Advisor for MC-Bauchemie Ghana. 
You are providing a high-level briefing to ${user.fullName} (${user.jobTitle || user.role}).

Analyze the following context representing an "${contextType}".
Return STRICTLY a JSON object matching this schema:
{
  "title": "A punchy, executive title",
  "summary": "1-2 sentence executive summary specifically for ${user.fullName}",
  "recommendation": "Deep, actionable HR advice based on your institutional knowledge",
  "confidence": number,
  "insights": [{ "id": "uuid", "type": "SUCCESS|WARNING|CRITICAL|NEUTRAL", "label": "string", "description": "string", "impact": number }],
  "suggestedTargets": [{ "title": "string", "description": "string", "priority": "LOW|MEDIUM|HIGH" }]
}

Your tone must be elite, direct, and insightful. Do not state the obvious—give ${user.fullName} the "Why" and the "How".

Context Data:
${JSON.stringify(sanitizedData, null, 2)}
`;

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    });

    const jsonResult = JSON.parse(result.response.text());
    res.json(jsonResult);
  } catch (err: any) {
    console.error('[AI] Insight Generation Error:', err.message);
    res.status(500).json({ error: 'Failed to generate AI insight.' });
  }
};

/**
 * Agentic Chat (Cortex)
 * Supports Autonomous Tool Execution via Function Calling.
 */
export const chat = async (req: Request, res: Response) => {
  if (!ai) return res.status(503).json({ 
    error: 'Cortex AI Assistant unavailable.',
    details: 'GEMINI_API_KEY is missing from environment variables. Please add it to Render dashboard.'
  });

  try {
    const { message, history } = req.body;
    const orgId = getOrgId(req) || 'default-tenant';
    const user = (req as any).user;

    // 1. Fetch organizational baseline for context
    const [empCount, depts] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId, isArchived: false, role: { not: 'DEV' } } }),
      prisma.department.findMany({ where: { organizationId: orgId }, select: { name: true } })
    ]);

    const sysPrompt = `You are "Cortex", the elite AI Intelligence Officer for MC-Bauchemie Ghana. 
Current User Context:
- Name: ${user.fullName}
- Position: ${user.jobTitle || user.role}
- Authority Rank: ${user.rank}
- Org Context: ${empCount} total personnel across ${depts.map(d => d.name).join(', ')} departments.

Operational Directives:
1. Speak naturally and professionally. Avoid robotic "As an AI..." phrases. Speak directly to ${user.fullName}.
2. Be highly intelligent and proactive. Answer complex HR, strategic, and operational questions with depth.
3. You have autonomous tools to search employees, check metrics, and request leave. Use them whenever it helps provide a "Real" answer.
4. If asked about organizational health, use your data tools to give factual insights.
5. Your tone should be that of a trusted Chief of Staff—sophisticated, discreet, and extremely capable.

Always refer to the user by name if appropriate and make them feel like they are talking to a human partner who knows their business inside out.`;

    // 2. Initialize Model with Tools & System Instruction
    const model = ai.getGenerativeModel({
      model: 'gemini-1.5-flash',
      tools: [{ functionDeclarations } as any],
      systemInstruction: sysPrompt,
    });

    // 3. Prepare Chat History (Exclude any previous system prompts to avoid conflicts)
    const formattedHistory = history?.filter((h: any) => h.role !== 'system').map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    })) || [];

    const chatSession = model.startChat({ history: formattedHistory });

    // 4. Send Message & Handle Tool Execution Loop
    let result;
    try {
        result = await chatSession.sendMessage(message);
    } catch (sendErr: any) {
        console.error('[Cortex Agent] Initial Send Error:', sendErr.message);
        return res.status(500).json({ error: 'Cortex was unable to process the initial signal. Possible API overload.' });
    }

    let response = result.response;
    let calls = response.functionCalls();
    let iterationCount = 0;
    const MAX_ITERATIONS = 5;

    // Iterate until AI stops calling functions or we hit limit
    const loopStartTime = Date.now();
    while (calls && calls.length > 0 && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      
      // Safety: Total tool loop timeout (15s)
      if (Date.now() - loopStartTime > 15000) {
        console.warn('[Cortex Agent] Maximum tool execution time exceeded. Terminating loop.');
        break;
      }

      const toolResults = await Promise.all(
        calls.map(async (call) => {
          const toolStart = Date.now();
          try {
            const data = await executeTool(call.name, call.args, user);
            console.log(`[Cortex Agent] Tool ${call.name} completed in ${Date.now() - toolStart}ms`);
            return {
              functionResponse: {
                name: call.name,
                response: { content: data }
              }
            };
          } catch (error: any) {
            console.error(`[Cortex Tool Error] ${call.name} (${Date.now() - toolStart}ms):`, error.message);
            return {
              functionResponse: {
                name: call.name,
                response: { error: error.message }
              }
            };
          }
        })
      );

      // Send tool results back to model
      try {
        result = await chatSession.sendMessage(toolResults as any);
        response = result.response;
        calls = response.functionCalls();
      } catch (loopErr: any) {
        console.error('[Cortex Agent] Tool Feedback Loop Error:', loopErr.message);
        break; // Exit loop and return what we have or an error
      }
    }

    res.json({ reply: response.text() });
  } catch (err: any) {
    console.error('[Cortex Agent] Critical synchronization fault:', err.stack || err.message);
    const errorMessage = err.message || 'Unknown error';
    res.status(500).json({ 
      error: 'Elite Intelligence layer experienced a synchronization fault.',
      details: errorMessage
    });
  }
};

export const parseResumeViaAI = async (req: Request, res: Response) => {
  if (!ai) return res.status(503).json({ 
    error: 'AI parsing unavailable.',
    details: 'GEMINI_API_KEY is missing from environment variables. Please add it to Render dashboard.'
  });

  try {
    const { candidateId } = req.body;
    const organizationId = req.user?.organizationId || 'default-tenant';

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId, organizationId },
      include: { jobPosition: true }
    });

    if (!candidate || !candidate.jobPosition) return res.status(404).json({ error: 'Job context missing.' });

    const prompt = `Analyze candidate fit for '${candidate.jobPosition.title}'. 
Email: ${candidate.email} | Notes: ${candidate.notes || 'None'}
Return STRICTLY JSON: { "matchScore": number, "summary": "string", "strengths": [], "weaknesses": [] }`;

    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
    });

    res.json(JSON.parse(result.response.text()));
  } catch (err: any) {
    console.error('[AI] Resume Parse Error:', err.message);
    res.status(500).json({ error: 'Parsing failure.' });
  }
};
