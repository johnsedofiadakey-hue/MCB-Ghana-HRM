import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

<<<<<<< HEAD
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
=======
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
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
    }

    next();
  } catch (error) {
    console.error('[TenantResolver] Error:', error);
    next();
  }
};
