import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';
import { getOrgId } from './enterprise.controller';

export const getPrograms = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const programs = await prisma.trainingProgram.findMany({
      where: whereOrg,
      include: { enrollments: { select: { id: true, status: true, completedAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(programs);
  } catch (err: any) {
    console.error('[training.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createProgram = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const user = (req as any).user;
    const createdById = user.id;
    const program = await prisma.trainingProgram.create({
      data: { 
        ...req.body, 
        createdById, 
        organizationId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null
      }
    });
    res.status(201).json(program);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const enroll = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const organizationId = orgId || 'mcb-ghana-tenant';
    const user = (req as any).user;
    const actorId = user.id;
    const { programId, employeeId } = req.body;
    const targetEmpId = employeeId || actorId;

    const enrollment = await prisma.trainingEnrollment.create({
      data: { programId, employeeId: targetEmpId, organizationId }
    });
    const program = await prisma.trainingProgram.findUnique({ where: { id: programId } });
    await notify(targetEmpId, 'Training Enrollment', `You have been enrolled in "${program?.title}"`, 'INFO', '/training');
    await logAction(actorId, 'TRAINING_ENROLLED', 'TrainingEnrollment', enrollment.id, { programId, employeeId: targetEmpId }, req.ip);
    res.status(201).json(enrollment);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const markComplete = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { enrollmentId, score, certificate } = req.body;
    const whereOrg = orgId ? { organizationId: orgId } : {};
    
    const enrollment = await prisma.trainingEnrollment.update({
      where: { id: enrollmentId, ...whereOrg },
      data: { status: 'COMPLETED', completedAt: new Date(), score, certificate },
      include: { program: true }
    });

    // --- INTEGRATION: Update KPI progress if applicable ---
    try {
      // Find an active KPI sheet for this employee
      const activeSheet = await prisma.kpiSheet.findFirst({
        where: {
          employeeId: enrollment.employeeId,
          organizationId: enrollment.organizationId,
          status: 'ACTIVE',
          isLocked: false
        }
      });

      if (activeSheet) {
        // Look for items in 'Development' or 'Training' category
        const kpiItem = await prisma.kpiItem.findFirst({
          where: {
            sheetId: activeSheet.id,
            category: { in: ['Development', 'Training', 'Learning'] }
          }
        });
        if (kpiItem) {
          // Increment actual value
          const actualValue = Number(kpiItem.actualValue) || 0;
          const targetValue = Number(kpiItem.targetValue) || 0;
          const weight = Number(kpiItem.weight) || 0;
          
          const newActual = actualValue + 1;
          const raw = targetValue > 0 ? (newActual / targetValue) * weight : 0;
          const newScore = Math.min(raw, weight * 1.2);

          await prisma.kpiItem.update({
            where: { id: kpiItem.id },
            data: { 
              actualValue: newActual, 
              score: newScore,
              lastEntryDate: new Date()
            }
          });

          // Update sheet total score
          const allItems = await prisma.kpiItem.findMany({ where: { sheetId: activeSheet.id } });
          const total = allItems.reduce((s, i) => s + (Number(i.score) || 0), 0);
          
          await prisma.kpiSheet.update({
            where: { id: activeSheet.id },
            data: { totalScore: total }
          });

          await notify(enrollment.employeeId, '🎯 KPI Auto-Updated', 
            `Your completion of "${enrollment.program.title}" has been added to your KPI progress.`, 'SUCCESS');
        }
      }
    } catch (kpiErr) {
      console.error('[training.controller] KPI Auto-update failed but training marked complete:', kpiErr);
    }

    await notify(enrollment.employeeId, 'Training Completed! 🎓', 'Congratulations on completing your training.', 'SUCCESS');
    res.json(enrollment);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const getMyTraining = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const userId = user.id;
    const enrollments = await prisma.trainingEnrollment.findMany({
      where: { employeeId: userId, ...whereOrg },
      include: { program: true },
      orderBy: { enrolledAt: 'desc' },
      take: 50
    });
    res.json(enrollments);
  } catch (err: any) {
    console.error('[training.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const exportTrainingCSV = async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const whereOrg = orgId ? { organizationId: orgId } : {};
    const programs = await prisma.trainingProgram.findMany({
      where: whereOrg,
      include: {
        enrollments: {
          include: { employee: { select: { fullName: true, jobTitle: true } } }
        }
      }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="training-report.csv"');

    let csv = 'Program,Provider,Status,Employee,Enrolled Date,Completed Date,Score\n';
    programs.forEach(p => {
      p.enrollments.forEach(e => {
        csv += `"${p.title}","${p.provider || ''}","${e.status}","${e.employee.fullName}","${e.enrolledAt.toLocaleDateString()}","${e.completedAt?.toLocaleDateString() || ''}","${e.score || ''}"\n`;
      });
    });
    res.send(csv);
  } catch (err: any) {
    console.error('[training.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
