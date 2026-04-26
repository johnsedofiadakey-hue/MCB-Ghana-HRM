import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const host = req.get('host') || '';
    const origin = req.get('origin') || '';
    const referer = req.get('referer') || '';
    const customDomainHeader = req.get('x-tenant-domain');

    // 1. Check if we are on a custom domain (Prioritize the explicit header from frontend)
    let domainToMatch = customDomainHeader || '';

    if (!domainToMatch) {
      // Try resolving from host if it's not our main domain
      const mainDomains = ['nexus-hr-platform-api.onrender.com', 'mcb-ghana-hrm-api.onrender.com', 'localhost'];
      if (!mainDomains.some(d => host.includes(d))) {
        domainToMatch = host.replace('www.', '');
      }
    }

    if (domainToMatch) {
      const organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { customDomain: domainToMatch },
            { subdomain: domainToMatch.split('.')[0] }
          ]
        },
        select: { id: true, name: true, customDomain: true, subdomain: true }
      });

      if (organization) {
        console.log('[SettingsService] Fetching settings for OrgID:', organization.id);
        (req as any).organizationId = organization.id;
        (req as any).organization = organization;
      }
    }

    next();
  } catch (error) {
    console.error('[TenantResolver] Error:', error);
    next();
  }
};
