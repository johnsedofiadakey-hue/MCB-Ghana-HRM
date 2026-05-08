import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from '../prisma/client';

export class AIService {
  private static getModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  /**
   * Job Architect: Generates a professional Job Description
   */
  static async generateJobDescription(title: string, departmentName: string): Promise<string> {
    const model = this.getModel();
    const prompt = `
      As an expert HR recruitment specialist, draft a professional and institutional Job Description.
      Role Title: "${title}"
      Department: "${departmentName}"
      Organization Context: MC Bauchemie Ghana (Construction Chemicals & Engineering)

      The description must include:
      1. Role Overview
      2. Key Responsibilities (Strategic & Tactical)
      3. Required Skills & Competencies
      4. Cultural Alignment expectations

      Tone: Formal, precise, and professional.
      Return ONLY the drafted markdown content.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  /**
   * Culture Pulse: Analyzes organizational sentiment based on recent activity/appraisals
   */
  static async getCultureInsights(organizationId: string): Promise<any> {
    // 1. Fetch some quantitative context (appraisal scores, leave volumes)
    const [appraisals, leaveTrends, terminations] = await Promise.all([
       prisma.performanceReviewV2.findMany({
          where: { organizationId, status: 'COMPLETED' },
          select: { finalScore: true, managerReview: true },
          take: 20,
          orderBy: { createdAt: 'desc' }
       }),
       prisma.leaveRequest.count({ where: { organizationId, status: 'APPROVED', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
       prisma.user.count({ where: { organizationId, status: 'TERMINATED', updatedAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } } })
    ]);

    const avgScore = appraisals.length > 0 
       ? appraisals.reduce((acc, r) => acc + Number(r.finalScore || 0), 0) / appraisals.length 
       : 0;

    const model = this.getModel();
    const prompt = `
      Analyze the current institutional culture pulse for an organization.
      Metrics:
      - Average Appraisal Score: ${avgScore.toFixed(2)} / 5.0
      - Recent Leave Volume (30 days): ${leaveTrends} requests
      - Recent Attrition (60 days): ${terminations} employees
      - Sample Manager Feedback: "${appraisals.map(a => a.managerReview).filter(Boolean).slice(0, 5).join(' | ')}"

      Provide a "Culture Radar" JSON object with:
      1. "sentiment": (One word: VIBRANT, STABLE, CAUTIOUS, or BURNT_OUT)
      2. "engagementScore": (0-100)
      3. "strategicAlignment": (0-100)
      4. "primaryRisk": (A short sentence)
      5. "recommendation": (A short actionable advice for HR)

      Return ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    try {
       return JSON.parse(text);
    } catch {
       return { sentiment: 'STABLE', engagementScore: 75, strategicAlignment: 80, primaryRisk: 'None detected', recommendation: 'Continue monitoring engagement.' };
    }
  }
}
