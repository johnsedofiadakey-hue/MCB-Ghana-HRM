import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';
import { completeOnboardingTasksForEvent } from '../services/onboarding-events.service';

export const upsertCallCard = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req) || 'mcb-ghana-tenant';
    const {
      employeeId,
      fullName,
      jobTitle,
      department,
      bio,
      email,
      phone,
      whatsapp,
      linkedin,
      github,
      website,
      theme,
      logoUrl,
      isActive,
      enableContactCollection
    } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }
    if (!fullName?.trim() || !jobTitle?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Full Name, Job Title, and Email are required fields' });
    }
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, organizationId: orgId, isArchived: false, status: { not: 'TERMINATED' } },
      select: { id: true }
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found in this organization' });

    const existing = await prisma.callCard.findFirst({ where: { employeeId, organizationId: orgId } });

    const payload = {
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim(),
        department: department?.trim() || null,
        bio: bio?.trim() || '',
        email: email.trim(),
        phone: phone?.trim() || '',
        whatsapp: whatsapp?.trim() || '',
        linkedin: linkedin?.trim() || '',
        github: github?.trim() || '',
        website: website?.trim() || '',
        theme: theme || 'MCB_GOLD',
        logoUrl: logoUrl || '',
        isActive: isActive !== undefined ? isActive : true,
        enableContactCollection: enableContactCollection !== undefined ? enableContactCollection : false
    };
    const card = existing
      ? await prisma.callCard.update({ where: { id: existing.id }, data: payload })
      : await prisma.callCard.create({ data: { ...payload, employeeId, organizationId: orgId } });
    if (payload.isActive) {
      await completeOnboardingTasksForEvent({ organizationId: orgId, employeeId, event: 'CALL_CARD_PUBLISHED', actorId: (req as any).user.id });
    }

    console.log(`[CallCard] Successfully configured card for Employee ID ${employeeId} with theme ${theme}`);
    res.status(200).json(card);
  } catch (error: any) {
    console.error('[CallCard] Upsert error:', error);
    res.status(500).json({ error: error.message || 'Failed to update Call Card' });
  }
};

export const getCallCardByEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const actor = (req as any).user;
    const organizationId = actor.organizationId || 'mcb-ghana-tenant';

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const canManage = (await PolicyService.evaluatePolicy(actor.id, Permission.CALL_CARD_MANAGE)).allowed;
    if (employeeId !== actor.id && !canManage) return res.status(403).json({ error: 'Access denied' });

    const card = await prisma.callCard.findFirst({
      where: { employeeId, organizationId }
    });

    if (card) {
      return res.json(card);
    }

    // Default template derived from active user database context
    const user = await prisma.user.findFirst({
      where: { id: employeeId, organizationId },
      include: { departmentObj: { select: { name: true } } }
    });

    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const defaultCard = {
      employeeId,
      fullName: user.fullName || '',
      jobTitle: user.jobTitle || '',
      department: user.departmentObj?.name || '',
      bio: '',
      email: user.email || '',
      phone: user.contactNumber || '',
      whatsapp: '',
      linkedin: '',
      github: '',
      website: '',
      theme: 'horizontal',
      logoUrl: '',
      isActive: true,
      enableContactCollection: false,
      isNew: true
    };

    res.json(defaultCard);
  } catch (error: any) {
    console.error('[CallCard] Retrieve employee error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Call Card settings' });
  }
};

export const getPublicCallCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    // Increment scan impressions (views) on every active card fetch
    const active = await prisma.callCard.findFirst({
      where: { id, isActive: true, employee: { isArchived: false, status: { not: 'TERMINATED' } } }
    });
    if (!active) return res.status(404).json({ error: 'Call Card not found or inactive.' });
    const card = await prisma.callCard.update({
      where: { id: active.id },
      data: { views: { increment: 1 } },
      include: {
        employee: {
          select: {
            avatarUrl: true,
            status: true
          }
        }
      }
    });

    if (!card) {
      return res.status(404).json({ error: 'Call Card not found or has been removed.' });
    }

    res.json(card);
  } catch (error: any) {
    console.error('[CallCard] Public retrieval error:', error);
    res.status(500).json({ error: error.message || 'Failed to scan public Call Card' });
  }
};

export const submitConnection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, company, notes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    if (!fullName?.trim() || !email?.trim()) {
      return res.status(400).json({ error: 'Full Name and Email are required to connect' });
    }

    const card = await prisma.callCard.findFirst({
      where: { id, isActive: true, employee: { isArchived: false, status: { not: 'TERMINATED' } } }
    });

    if (!card) {
      return res.status(404).json({ error: 'Call Card not found.' });
    }

    if (!card.enableContactCollection) {
      return res.status(403).json({ error: 'Contact collection is not enabled for this employee.' });
    }

    const connection = await prisma.callCardConnection.create({
      data: {
        callCardId: id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone?.trim() || '',
        company: company?.trim() || '',
        notes: notes?.trim() || ''
      }
    });

    res.status(201).json({ message: 'Connection submitted successfully', connection });
  } catch (error: any) {
    console.error('[CallCard] Submit connection error:', error);
    res.status(500).json({ error: error.message || 'Failed to exchange contacts.' });
  }
};

export const getEmployeeConnections = async (req: Request, res: Response) => {
  try {
    const employeeId = (req as any).user?.id;

    if (!employeeId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizationId = (req as any).user.organizationId || 'mcb-ghana-tenant';
    const card = await prisma.callCard.findFirst({
      where: { employeeId, organizationId },
      include: {
        connections: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!card) {
      return res.json({ views: 0, connections: [] });
    }

    res.json({
      views: card.views,
      connections: card.connections
    });
  } catch (error: any) {
    console.error('[CallCard] Get employee connections error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch connection logs' });
  }
};
