import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { getOrgId } from './enterprise.controller';

export const upsertCallCard = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
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

    const card = await prisma.callCard.upsert({
      where: { employeeId },
      update: {
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
      },
      create: {
        employeeId,
        organizationId: orgId || 'mcb-ghana-tenant',
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
      }
    });

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

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const card = await prisma.callCard.findUnique({
      where: { employeeId }
    });

    if (card) {
      return res.json(card);
    }

    // Default template derived from active user database context
    const user = await prisma.user.findUnique({
      where: { id: employeeId },
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
    const card = await prisma.callCard.update({
      where: { id },
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

    if (!card.isActive) {
      return res.status(403).json({ error: 'This digital call card is currently suspended by management.' });
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

    const card = await prisma.callCard.findUnique({
      where: { id }
    });

    if (!card) {
      return res.status(404).json({ error: 'Call Card not found.' });
    }

    if (!card.enableContactCollection) {
      return res.status(403).json({ error: 'Contact collection is not enabled for this employee by the IT Admin.' });
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

    const card = await prisma.callCard.findUnique({
      where: { employeeId },
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
