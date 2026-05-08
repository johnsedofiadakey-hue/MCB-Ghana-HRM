import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { PdfExportService } from '../services/pdf.service';
import { errorLogger } from '../services/error-log.service';

const getOrgId = (req: Request): string => (req as any).user?.organizationId || 'mcb-ghana-tenant';

export const exportTargetPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);

    const target = await prisma.target.findUnique({
      where: { id, organizationId: orgId },
      include: {
        metrics: true,
        assignee: { select: { fullName: true } },
        department: { select: { name: true } },
        originator: { select: { fullName: true } },
        lineManager: { select: { fullName: true } },
        reviewer: { select: { fullName: true } },
        updates: {
          include: { submittedBy: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!target) return res.status(404).json({ error: 'Target not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Target Achievement Certificate: ${target.title}`, target as any, 'TARGET');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Target_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportTargetPdf', err);
    return res.status(500).json({ error: 'Failed to generate target PDF' });
  }
};

export const exportAppraisalPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);

    const packet = await prisma.appraisalPacket.findUnique({
      where: { id, organizationId: orgId },
      include: {
        employee: { 
          select: { 
            fullName: true,
            jobTitle: true,
            employeeCode: true,
            departmentObj: { select: { name: true } }
          } 
        },
        cycle: { select: { title: true } },
        reviews: {
          include: { reviewer: { select: { fullName: true } } },
          orderBy: { submittedAt: 'asc' }
        },
        resolvedBy: { select: { fullName: true } }
      }
    });

    if (!packet) return res.status(404).json({ error: 'Appraisal packet not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Performance Appraisal: ${packet.employee?.fullName}`, packet as any, 'APPRAISAL');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Appraisal_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportAppraisalPdf', err);
    return res.status(500).json({ error: 'Failed to generate appraisal PDF' });
  }
};

export const exportLeavePdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);

    const leave = await prisma.leaveRequest.findUnique({
      where: { id, organizationId: orgId },
      include: {
        employee: { 
            include: { departmentObj: { select: { name: true } } }
        },
        reliever: { select: { fullName: true } },
        manager: { select: { fullName: true } },
        hrReviewer: { select: { fullName: true } },
        handoverRecords: {
          include: { reliever: { select: { fullName: true } } }
        }
      }
    });

    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Leave Authorization Certificate`, leave as any, 'LEAVE');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Leave_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportLeavePdf', err);
    return res.status(500).json({ error: 'Failed to generate leave PDF' });
  }
};

export const exportRoadmapPdf = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userRank = (req as any).user.rank || 0;

    // Fetch all targets where user is assignee OR team targets if manager+
    const targets = await prisma.target.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { assigneeId: userId },
          ...(userRank >= 60 ? [{ originatorId: userId }] : []),
          ...(userRank >= 80 ? [{ level: 'DEPARTMENT' }] : [])
        ],
        isArchived: false
      },
      include: {
        metrics: true,
        assignee: { select: { fullName: true } },
        department: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (targets.length === 0) {
      return res.status(404).json({ error: 'No active targets identified for roadmap generation.' });
    }

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, `Strategic Performance Roadmap: ${(req as any).user.name}`, targets as any, 'TARGET_ROADMAP');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Roadmap_${userId}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportRoadmapPdf', err);
    return res.status(500).json({ error: 'Failed to generate roadmap PDF' });
  }
};

