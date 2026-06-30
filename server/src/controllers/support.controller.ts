import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { PolicyService } from '../services/policy.service';
import { Permission } from '../types/permissions';

const queuePermissions: Record<string, string> = {
  IT: Permission.HELPDESK_IT,
  HR: Permission.HELPDESK_HR,
  FINANCE: Permission.HELPDESK_FINANCE,
  MARKETING: Permission.HELPDESK_MARKETING,
  FACILITIES: Permission.HELPDESK_FACILITIES,
  OTHER: Permission.HELPDESK_OTHER,
};

const normalizeQueue = (category?: string) => {
  const value = String(category || 'OTHER').toUpperCase();
  if (['IT', 'HR', 'FINANCE', 'MARKETING'].includes(value)) return value;
  if (['FACILITY', 'FACILITIES', 'MAINTENANCE', 'OPERATIONS'].includes(value)) return 'FACILITIES';
  return 'OTHER';
};

export const addBusinessMinutes = (start: Date, minutes: number) => {
  const result = new Date(start);
  const moveToBusinessWindow = () => {
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
      result.setHours(9, 0, 0, 0);
    }
    if (result.getHours() < 9) result.setHours(9, 0, 0, 0);
    if (result.getHours() >= 17) {
      result.setDate(result.getDate() + 1);
      result.setHours(9, 0, 0, 0);
      moveToBusinessWindow();
    }
  };
  moveToBusinessWindow();
  let remaining = Math.max(0, Math.ceil(minutes));
  while (remaining > 0) {
    moveToBusinessWindow();
    const endOfDay = new Date(result);
    endOfDay.setHours(17, 0, 0, 0);
    const available = Math.max(0, Math.floor((endOfDay.getTime() - result.getTime()) / 60000));
    if (remaining <= available) {
      result.setMinutes(result.getMinutes() + remaining);
      remaining = 0;
      break;
    }
    remaining -= available;
    result.setDate(result.getDate() + 1);
    result.setHours(9, 0, 0, 0);
  }
  return result;
};

export const addBusinessHours = (start: Date, hours: number) => addBusinessMinutes(start, hours * 60);

export const businessMinutesBetween = (start: Date, end: Date) => {
  if (end <= start) return 0;
  let totalMs = 0;
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const finalDay = new Date(end);
  finalDay.setHours(0, 0, 0, 0);
  while (day <= finalDay) {
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      const windowStart = new Date(day); windowStart.setHours(9, 0, 0, 0);
      const windowEnd = new Date(day); windowEnd.setHours(17, 0, 0, 0);
      const overlapStart = Math.max(start.getTime(), windowStart.getTime());
      const overlapEnd = Math.min(end.getTime(), windowEnd.getTime());
      if (overlapEnd > overlapStart) totalMs += overlapEnd - overlapStart;
    }
    day.setDate(day.getDate() + 1);
  }
  return Math.ceil(totalMs / 60000);
};

const slaHours: Record<string, number> = { URGENT: 4, HIGH: 8, NORMAL: 24, LOW: 40 };

const managedQueues = async (userId: string) => {
  const queues: string[] = [];
  for (const [queue, permission] of Object.entries(queuePermissions)) {
    if ((await PolicyService.evaluatePolicy(userId, permission)).allowed) queues.push(queue);
  }
  return queues;
};

const canAccessTicket = async (ticket: any, userId: string) => {
  if (ticket.employeeId === userId || ticket.assignedToId === userId) return true;
  const permission = queuePermissions[ticket.queue];
  return permission ? (await PolicyService.evaluatePolicy(userId, permission)).allowed : false;
};

/**
 * SUPPORT & HELPDESK CONTROLLER
 */

export const createTicket = async (req: Request, res: Response) => {
  try {
    const { subject, description, category, priority } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const employeeId = req.user?.id!;
    const queue = normalizeQueue(category);
    const normalizedPriority = String(priority || 'NORMAL').toUpperCase();
    if (!subject?.trim() || !description?.trim()) return res.status(400).json({ error: 'Subject and description are required' });
    if (!Object.prototype.hasOwnProperty.call(slaHours, normalizedPriority)) {
      return res.status(400).json({ error: 'Priority must be URGENT, HIGH, NORMAL, or LOW' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId,
        subject,
        description,
        category: category || queue,
        queue,
        priority: normalizedPriority,
        status: 'OPEN',
        employeeId,
        slaDueAt: addBusinessHours(new Date(), slaHours[normalizedPriority] || slaHours.NORMAL),
      }
    });
    await prisma.ticketActivity.create({
      data: { organizationId, ticketId: ticket.id, actorId: employeeId, action: 'CREATED', metadata: { queue, priority: normalizedPriority } },
    });

    await logAction(employeeId, 'CREATE_SUPPORT_TICKET', 'SupportTicket', ticket.id, { category, priority }, req.ip);
    
    const roleByQueue: Record<string, string[]> = {
      IT: ['IT_MANAGER', 'IT_ADMIN'], HR: ['HR_DIRECTOR', 'HR_MANAGER'], FINANCE: ['FINANCE_MANAGER'],
      MARKETING: ['MARKETING_HEAD'], FACILITIES: ['DIRECTOR'], OTHER: ['DIRECTOR'],
    };
    const queueOwners = await prisma.user.findMany({
      where: { organizationId, role: { in: roleByQueue[queue] || [] } },
      select: { id: true }
    });
    
    for (const admin of queueOwners) {
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

    const { tab } = req.query;
    const tabFilter: any = tab === 'open' ? { status: { in: ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'REOPENED'] } }
      : tab === 'waiting' ? { status: 'WAITING_REQUESTER' }
      : tab === 'resolved' ? { status: 'RESOLVED' }
      : tab === 'closed' ? { status: 'CLOSED' }
      : {};
    const tickets = await prisma.supportTicket.findMany({
      where: { employeeId, organizationId, ...tabFilter },
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
    const { status, category, tab } = req.query;
    const userId = req.user?.id!;
    const queues = await managedQueues(userId);
    if (!queues.length) return res.status(403).json({ error: 'No help-desk queue is assigned to this account.' });

    const tabFilter: any = tab === 'unassigned' ? { assignedToId: null }
      : tab === 'mine' ? { assignedToId: userId }
      : tab === 'waiting-requester' ? { status: 'WAITING_REQUESTER' }
      : tab === 'sla-breaches' ? { slaDueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } }
      : tab === 'resolved' ? { status: 'RESOLVED' }
      : {};

    const tickets = await prisma.supportTicket.findMany({
      where: {
        organizationId,
        queue: { in: queues },
        ...tabFilter,
        ...(status ? { status: status as string } : {}),
        ...(category ? { queue: normalizeQueue(category as string) } : {})
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
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const userId = req.user?.id!;
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, organizationId },
      include: {
        employee: { select: { fullName: true, email: true, avatarUrl: true } },
        assignedTo: { select: { fullName: true, email: true } },
        comments: {
          include: { user: { select: { fullName: true, avatarUrl: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        },
        activities: { orderBy: { createdAt: 'asc' } },
      }
    });

    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!(await canAccessTicket(ticket, userId))) return res.status(403).json({ error: 'Access denied' });
    const isRequester = ticket.employeeId === userId;
    res.json({ ...ticket, comments: isRequester ? ticket.comments.filter((comment) => !comment.isInternal) : ticket.comments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { content, attachmentUrl, isInternal } = req.body;
    const userId = req.user?.id!;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, organizationId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!(await canAccessTicket(ticket, userId))) return res.status(403).json({ error: 'Access denied' });
    if (isInternal && ticket.employeeId === userId) return res.status(403).json({ error: 'Requesters cannot create internal notes' });
    if (!content?.trim()) return res.status(400).json({ error: 'Comment is required' });

    const comment = await prisma.ticketComment.create({
      data: {
        organizationId,
        ticketId,
        userId,
        content,
        attachmentUrl,
        isInternal: Boolean(isInternal),
      }
    });

    const requesterResumed = ticket.employeeId === userId && ticket.status === 'WAITING_REQUESTER' && ticket.slaPausedAt;
    const pausedBusinessMinutes = requesterResumed
      ? businessMinutesBetween(ticket.slaPausedAt!, new Date())
      : 0;
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        ...(ticket.firstResponseAt || ticket.employeeId === userId ? {} : { firstResponseAt: new Date() }),
        ...(requesterResumed ? {
          status: 'IN_PROGRESS',
          slaPausedAt: null,
          slaPausedMinutes: ticket.slaPausedMinutes + pausedBusinessMinutes,
          slaDueAt: ticket.slaDueAt ? addBusinessMinutes(ticket.slaDueAt, pausedBusinessMinutes) : null,
        } : {}),
      }
    });

    if (requesterResumed) {
      await prisma.ticketActivity.create({
        data: { organizationId, ticketId, actorId: userId, action: 'REQUESTER_REPLIED', metadata: { resumedSlaMinutes: pausedBusinessMinutes } },
      });
    }

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, assignedToId, resolutionSummary } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const actorId = req.user?.id!;
    const current = await prisma.supportTicket.findFirst({ where: { id, organizationId } });
    if (!current) return res.status(404).json({ error: 'Ticket not found' });
    if (!(await canAccessTicket(current, actorId))) return res.status(403).json({ error: 'Access denied' });

    const transitions: Record<string, string[]> = {
      OPEN: ['TRIAGED', 'IN_PROGRESS', 'CLOSED'], TRIAGED: ['IN_PROGRESS', 'WAITING_REQUESTER', 'RESOLVED'],
      IN_PROGRESS: ['WAITING_REQUESTER', 'RESOLVED'], WAITING_REQUESTER: ['IN_PROGRESS', 'RESOLVED'],
      RESOLVED: ['CLOSED', 'REOPENED'], REOPENED: ['TRIAGED', 'IN_PROGRESS', 'WAITING_REQUESTER', 'RESOLVED'], CLOSED: ['REOPENED'],
    };
    if (status && !transitions[current.status]?.includes(status)) {
      return res.status(409).json({ error: `Invalid ticket transition from ${current.status} to ${status}` });
    }
    if (status === 'RESOLVED' && !resolutionSummary?.trim()) return res.status(400).json({ error: 'A resolution summary is required.' });
    if (assignedToId) {
      const assignee = await prisma.user.findFirst({ where: { id: assignedToId, organizationId }, select: { id: true } });
      if (!assignee) return res.status(400).json({ error: 'Assignee is not in this organization.' });
      const permission = queuePermissions[current.queue];
      if (!permission || !(await PolicyService.evaluatePolicy(assignedToId, permission)).allowed) {
        return res.status(400).json({ error: 'Assignee is not authorized for this department queue.' });
      }
    }

    const data: any = {};
    if (status) data.status = status;
    if (assignedToId) { data.assignedToId = assignedToId; data.assignedAt = new Date(); }
    if (resolutionSummary !== undefined) data.resolutionSummary = resolutionSummary;
    if (status === 'WAITING_REQUESTER') data.slaPausedAt = new Date();
    if (current.status === 'WAITING_REQUESTER' && status && status !== 'WAITING_REQUESTER' && current.slaPausedAt) {
      const pausedMinutes = businessMinutesBetween(current.slaPausedAt, new Date());
      data.slaPausedMinutes = current.slaPausedMinutes + pausedMinutes;
      data.slaDueAt = current.slaDueAt ? addBusinessMinutes(current.slaDueAt, pausedMinutes) : null;
      data.slaPausedAt = null;
    }
    if (status === 'RESOLVED') data.resolvedAt = new Date();
    if (status === 'CLOSED') data.closedAt = new Date();

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data
    });
    await prisma.ticketActivity.create({
      data: { organizationId, ticketId: ticket.id, actorId, action: status ? `STATUS_${status}` : 'ASSIGNED', metadata: { assignedToId, resolutionSummary } },
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

export const reopenTicket = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const userId = req.user?.id!;
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, organizationId, employeeId: userId } });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) return res.status(409).json({ error: 'Only resolved or closed tickets can be reopened' });
    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'REOPENED', resolvedAt: null, closedAt: null, resolutionSummary: null,
        slaPausedAt: null, slaPausedMinutes: 0,
        slaDueAt: addBusinessHours(new Date(), slaHours[String(ticket.priority || 'NORMAL').toUpperCase()] || slaHours.NORMAL),
      },
    });
    await prisma.ticketActivity.create({
      data: { organizationId, ticketId: ticket.id, actorId: userId, action: 'STATUS_REOPENED' },
    });
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getQueueDashboard = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const queues = await managedQueues(req.user?.id!);
    if (!queues.length) return res.status(403).json({ error: 'No help-desk queue is assigned to this account.' });
    const where = { organizationId, queue: { in: queues } };
    const [byStatus, byQueue, workload, breached, resolved] = await Promise.all([
      prisma.supportTicket.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.supportTicket.groupBy({ by: ['queue'], where, _count: { _all: true } }),
      prisma.supportTicket.groupBy({ by: ['assignedToId'], where: { ...where, status: { notIn: ['RESOLVED', 'CLOSED'] } }, _count: { _all: true } }),
      prisma.supportTicket.count({ where: { ...where, slaDueAt: { lt: new Date() }, status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      prisma.supportTicket.findMany({ where: { ...where, resolvedAt: { not: null } }, select: { createdAt: true, resolvedAt: true } }),
    ]);
    const assigneeIds = workload.map(item => item.assignedToId).filter((id): id is string => Boolean(id));
    const assignees = assigneeIds.length
      ? await prisma.user.findMany({ where: { id: { in: assigneeIds }, organizationId }, select: { id: true, fullName: true } })
      : [];
    const names = new Map(assignees.map(person => [person.id, person.fullName]));
    const averageResolutionMinutes = resolved.length
      ? Math.round(resolved.reduce((sum, item) => sum + ((item.resolvedAt!.getTime() - item.createdAt.getTime()) / 60000), 0) / resolved.length)
      : 0;
    return res.json({
      queues,
      byStatus: Object.fromEntries(byStatus.map(item => [item.status, item._count._all])),
      byQueue: Object.fromEntries(byQueue.map(item => [item.queue, item._count._all])),
      workload: workload.map(item => ({ assignedToId: item.assignedToId, name: item.assignedToId ? names.get(item.assignedToId) : 'Unassigned', count: item._count._all })),
      slaBreaches: breached,
      averageResolutionMinutes,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const listKnowledgeArticles = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const userId = req.user?.id!;
    const queues = await managedQueues(userId);
    const requestedQueue = req.query.queue ? normalizeQueue(String(req.query.queue)) : undefined;
    const canManageRequested = requestedQueue ? queues.includes(requestedQueue) : queues.length > 0;
    const articles = await prisma.knowledgeArticle.findMany({
      where: {
        organizationId,
        ...(requestedQueue ? { queue: requestedQueue } : {}),
        ...(canManageRequested ? { queue: { in: requestedQueue ? [requestedQueue] : queues } } : { status: 'PUBLISHED' }),
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json(articles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const createKnowledgeArticle = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const userId = req.user?.id!;
    const queue = normalizeQueue(req.body.queue);
    const queues = await managedQueues(userId);
    if (!queues.includes(queue)) return res.status(403).json({ error: 'You do not manage this knowledge-base queue.' });
    if (!req.body.title?.trim() || !req.body.content?.trim()) return res.status(400).json({ error: 'Title and content are required.' });
    const status = req.body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    const article = await prisma.knowledgeArticle.create({
      data: { organizationId, queue, title: req.body.title.trim(), content: req.body.content.trim(), status, createdById: userId },
    });
    return res.status(201).json(article);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
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
