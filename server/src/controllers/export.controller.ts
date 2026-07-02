import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
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
        manager: { select: { fullName: true, signatureUrl: true } },
        hrReviewer: { select: { fullName: true, signatureUrl: true } },
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

export const exportEmployeePdf = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { id } = req.params;
    const requester = (req as any).user;

    // Only the employee themselves, or a manager-tier+ viewer, may pull the full dossier
    if (requester?.id !== id && (requester?.rank || 0) < 75 && requester?.role !== 'DEV') {
      return res.status(403).json({ error: 'Not authorized to export this employee dossier' });
    }

    const employee = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      include: {
        departmentObj: { select: { name: true } },
        supervisor: { select: { fullName: true } },
        appraisalPackets: {
          where: { status: { not: 'CANCELLED' } },
          include: {
            cycle: { select: { title: true, period: true } },
            reviews: { select: { reviewStage: true, overallRating: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        targetsAssignedToMe: {
          where: { isArchived: false },
          select: { title: true, progress: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const pdfBuffer = await PdfExportService.generateBrandedPdf(orgId, 'Official Personnel Dossier', employee as any, 'EMPLOYEE_DOSSIER');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Employee_Dossier_${employee.employeeCode || employee.id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    errorLogger.log('ExportController.exportEmployeePdf', err);
    return res.status(500).json({ error: 'Failed to generate employee dossier PDF' });
  }
};

export const exportEmployeesPdf = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const employees = await prisma.user.findMany({
      where: { organizationId: orgId, isArchived: false },
      include: { departmentObj: true },
      orderBy: { fullName: 'asc' }
    });

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, primaryColor: true }
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdf = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=employees_export.pdf');
      res.send(pdf);
    });

    const primary = org?.primaryColor || '#4F46E5';
    doc.fillColor(primary).fontSize(18).font('Helvetica-Bold').text(org?.name || 'MCB HRM Ghana', { align: 'center' });
    doc.moveDown(0.4);
    doc.fillColor('#111827').fontSize(14).text('Employee Register', { align: 'center' });
    doc.moveDown(1.5);

    employees.forEach((employee, index) => {
      if (doc.y > 740) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
        .text(`${index + 1}. ${employee.fullName}`);
      doc.font('Helvetica').fontSize(8).fillColor('#4B5563')
        .text(`${employee.employeeCode || 'No code'} | ${employee.email} | ${employee.role} | ${employee.departmentObj?.name || 'No department'} | ${employee.status}`);
      doc.moveDown(0.6);
    });

    doc.end();
  } catch (err: any) {
    errorLogger.log('ExportController.exportEmployeesPdf', err);
    return res.status(500).json({ error: 'Failed to generate employee register PDF' });
  }
};
