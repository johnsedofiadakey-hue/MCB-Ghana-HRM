import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

/**
 * SUPPORT & HELPDESK CONTROLLER
 */

export const createTicket = async (req: Request, res: Response) => {
  try {
    const { subject, description, category, priority } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const employeeId = req.user?.id!;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId,
        subject,
        description,
        category,
        priority: priority || 'NORMAL',
        status: 'OPEN',
        employeeId
      }
    });

    await logAction(employeeId, 'CREATE_SUPPORT_TICKET', 'SupportTicket', ticket.id, { category, priority }, req.ip);
    
    // Notify IT Admins
    const itAdmins = await prisma.user.findMany({ 
      where: { role: 'IT_ADMIN' },
      select: { id: true }
    });
    
    for (const admin of itAdmins) {
      await notify(admin.id, 'New Support Ticket 🎫', `[${category}] ${subject}`, 'WARNING', `/support/tickets/${ticket.id}`);
    }

    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.id!;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const tickets = await prisma.supportTicket.findMany({
      where: { employeeId, organizationId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const { status, category } = req.query;

    const tickets = await prisma.supportTicket.findMany({
      where: {
        organizationId,
        ...(status ? { status: status as string } : {}),
        ...(category ? { category: category as string } : {})
      },
      include: {
        employee: { select: { fullName: true, departmentObj: { select: { name: true } } } },
        assignedTo: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tickets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTicketDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        employee: { select: { fullName: true, email: true, avatarUrl: true } },
        assignedTo: { select: { fullName: true, email: true } },
        comments: {
          include: { user: { select: { fullName: true, avatarUrl: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { content, attachmentUrl } = req.body;
    const userId = req.user?.id!;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const comment = await prisma.ticketComment.create({
      data: {
        organizationId,
        ticketId,
        userId,
        content,
        attachmentUrl
      }
    });

    // Update ticket updatedAt
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedToId } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (assignedToId) data.assignedToId = assignedToId;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data
    });

    // Notify employee if status changed
    if (status) {
      await notify(ticket.employeeId, 'Ticket Updated 🎫', `Your ticket status is now: ${status}`, 'INFO', `/support/tickets/${id}`);
    }

    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * LEAD GENERATION (Public Landing Page)
 */
export const createLead = async (req: Request, res: Response) => {
  try {
    const { name, email, company, phone, subject, message } = req.body;

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        company,
        phone,
        subject,
        message,
        status: 'NEW'
      }
    });

    // Notify NOC Operators if possible
    console.log(`[Lead] New Inquiry Captured: ${email} for ${company || 'Unknown'}`);

    res.status(201).json({ success: true, leadId: lead.id });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getLeads = async (req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
