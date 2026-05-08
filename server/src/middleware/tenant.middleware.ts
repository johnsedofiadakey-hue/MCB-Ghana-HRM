import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

// 🛡️ PERFORMANCE FIX: Simple in-memory cache for the primary tenant
let cachedOrganization: any = null;
const CACHE_TTL = 300000; // 5 minutes
let lastCacheUpdate = 0;

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const DEFAULT_ORG_ID = 'mcb-ghana-tenant';
    const now = Date.now();
    
    (req as any).organizationId = DEFAULT_ORG_ID;
    
    // Check cache first
    if (!cachedOrganization || (now - lastCacheUpdate) > CACHE_TTL) {
      const organization = await prisma.organization.findUnique({
        where: { id: DEFAULT_ORG_ID },
        select: { id: true, name: true }
      });
      
      if (organization) {
        cachedOrganization = organization;
        lastCacheUpdate = now;
      }
    }
    
    if (cachedOrganization) {
      (req as any).organization = cachedOrganization;
    }

    next();
  } catch (error) {
    console.error('[TenantResolver] Error:', error);
    next();
  }
};
