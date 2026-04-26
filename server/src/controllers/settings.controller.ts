import { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { getRoleRank } from '../middleware/auth.middleware';
import prisma from '../prisma/client';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const resolvedOrgId = (req as any).organizationId;
    
    // Priority: Resolved from domain/header > Authenticated user's org > Default
    const orgId = resolvedOrgId || user?.organizationId || 'default-tenant';

    const isAdmin = user ? getRoleRank(user.role) >= 85 : false; 
    const settings = await settingsService.getSettings(orgId, isAdmin);
    
    res.json(settings || {});
  } catch (error: any) {
    console.error('[SettingsController] Critical failure fetching settings:', error);
    res.json({
      companyName: 'MC Bauchemie',
      name: 'MC Bauchemie',
      subtitle: 'Enterprise Portal',
      logoUrl: '',
      primaryColor: '#4F46E5', 
      themePreset: 'premium-canvas',
      bgMain: '#f9fafb',
      textPrimary: '#0f172a'
    });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (getRoleRank(user.role) < 85) {
      return res.status(403).json({ error: 'Only IT/HR Managers or MD can update admin settings' });
    }
    const orgId = user?.organizationId || 'default-tenant';
    const settings = await settingsService.updateSettings(orgId, req.body);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
