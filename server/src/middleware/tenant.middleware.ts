import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // STANDALONE MODE: Everything is consolidated into the primary organization
    const DEFAULT_ORG_ID = 'mcb-ghana-tenant';
    
    (req as any).organizationId = DEFAULT_ORG_ID;
    
    // Optional: Pre-fetch the organization object to avoid repeated lookups in controllers
    const organization = await prisma.organization.findUnique({
      where: { id: DEFAULT_ORG_ID },
      select: { id: true, name: true }
    });
    
    if (organization) {
      (req as any).organization = organization;
    }

    next();
  } catch (error) {
    console.error('[TenantResolver] Error:', error);
    next();
  }
};
