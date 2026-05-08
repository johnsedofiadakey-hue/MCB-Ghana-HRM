import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

/**
 * AI Guard Middleware
 * 
 * Intercepts AI-related requests and verifies if the organization has
 * enabled Cortex AI features in their global settings.
 */
export const aiGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as any).organizationId || (req as any).user?.organizationId || 'mcb-ghana-tenant';
    
    // Check if it's a DEV account (Rank 100) - they bypass guards for testing
    if ((req as any).user?.role === 'DEV') {
      return next();
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { isAiEnabled: true }
    });

    if (!org || !org.isAiEnabled) {
      return res.status(403).json({ 
        error: 'AI_DISABLED', 
        message: 'Strategic Cortex AI features are currently deactivated by your institutional administrator. Contact IT/HR to enable AI intelligence.' 
      });
    }

    next();
  } catch (err) {
    console.error('[AIGuard] Critical failure:', err);
    // Fail closed for security/privacy
    res.status(500).json({ error: 'AI_VERIFICATION_FAILURE', message: 'Could not verify institutional AI compliance status.' });
  }
};
