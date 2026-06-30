
import prisma from '../prisma/client';
import { notify } from './websocket.service';

export class AnnouncementService {
  /**
   * Create an announcement
   */
  static async create(organizationId: string, createdById: string, data: any) {
    const { title, content, targetAudience, departmentId, priority, expirationDate } = data;
    if (targetAudience === 'DEPARTMENT') {
      const department = await prisma.department.findFirst({
        where: { id: Number(departmentId), organizationId },
        select: { id: true }
      });
      if (!department) throw new Error('Target department not found in this organization');
    }

    const announcement = await prisma.announcement.create({
      data: {
        organizationId,
        createdById,
        title,
        content,
        targetAudience: targetAudience || 'ALL',
        departmentId: departmentId ? parseInt(departmentId) : null,
        priority: priority || 'NORMAL',
        expirationDate: expirationDate ? new Date(expirationDate) : null,
      },
      include: {
        createdBy: { select: { fullName: true, role: true } },
        department: { select: { name: true } }
      }
    });

    // Notify the target audience
    let targetUserIds: string[] = [];

    if (targetAudience === 'ALL') {
      const users = await prisma.user.findMany({ where: { organizationId, isArchived: false }, select: { id: true } });
      targetUserIds = users.map(u => u.id);
    } else if (targetAudience === 'DEPARTMENT' && departmentId) {
      const users = await prisma.user.findMany({ where: { organizationId, departmentId: parseInt(departmentId), isArchived: false }, select: { id: true } });
      targetUserIds = users.map(u => u.id);
    } else if (targetAudience === 'MANAGERS') {
      const users = await prisma.user.findMany({ where: { organizationId, role: { in: ['MD', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'IT_MANAGER', 'HR_OFFICER'] }, isArchived: false }, select: { id: true } });
      targetUserIds = users.map(u => u.id);
    }

    // Bulk notify (via WebSocket)
    for (const uid of targetUserIds) {
      if (uid === createdById) continue; // Skip self
      await notify(uid, `📢 ${title}`, content.substring(0, 100), priority === 'URGENT' ? 'WARNING' : 'INFO', '/announcements');
    }

    return announcement;
  }

  /**
   * List announcements for a user based on their role and department
   */
  static async listForUser(organizationId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!user) throw new Error('User not found');

    const now = new Date();
    const role = String(user.role || '').toUpperCase();
    const isManager = ['MD', 'DIRECTOR', 'HR_DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER', 'MARKETING_HEAD', 'IT_MANAGER', 'MANAGER', 'MID_MANAGER', 'SUPERVISOR', 'DEV'].includes(role);
    const isExecutive = ['MD', 'DIRECTOR', 'HR_DIRECTOR', 'DEV'].includes(role);
    const audiences: any[] = [
      { targetAudience: 'ALL' },
      { targetAudience: 'DEPARTMENT', departmentId: user.departmentId },
    ];
    if (isManager) audiences.push({ targetAudience: 'MANAGERS' });
    if (isExecutive) audiences.push({ targetAudience: 'EXECUTIVES' });

    return prisma.announcement.findMany({
      where: {
        organizationId,
        OR: audiences,
        AND: [
            { OR: [ { expirationDate: null }, { expirationDate: { gte: now } } ] }
        ]
      },
      include: {
        createdBy: { select: { fullName: true, role: true, avatarUrl: true } },
        department: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Delete an announcement
   */
  static async delete(id: string, organizationId: string, actorId: string, actorRole: string) {
    const announcement = await prisma.announcement.findFirst({ where: { id, organizationId } });
    if (!announcement) throw new Error('Announcement not found');
    
    // Authorization: Creator or MD/Admin
    if (announcement.createdById !== actorId && actorRole !== 'MD' && actorRole !== 'DEV') {
      throw new Error('Unauthorized to delete this announcement');
    }

    return prisma.announcement.delete({ where: { id: announcement.id } });
  }
}
