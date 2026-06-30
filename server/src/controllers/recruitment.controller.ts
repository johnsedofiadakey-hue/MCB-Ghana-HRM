import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';
import { notify } from '../services/websocket.service';

/**
 * RECRUITMENT & ATS CONTROLLER
 * Handles Job Postings, Candidate Applications, and Interview Pipelines.
 */

// ─── JOB POSITIONS ────────────────────────────────────────────────────────

export const createJobPosition = async (req: Request, res: Response) => {
  try {
    const { title, departmentId, description, location, employmentType } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const job = await prisma.jobPosition.create({
      data: {
        organizationId,
        title,
        departmentId: departmentId ? parseInt(departmentId) : null,
        description,
        location,
        employmentType,
        status: 'OPEN',
        openedById: req.user?.id
      }
    });

    await logAction(req.user?.id, 'CREATE_JOB_POSITION', 'JobPosition', job.id, { title }, req.ip);
    res.status(201).json(job);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getJobPositions = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const { status } = req.query;

    const jobs = await prisma.jobPosition.findMany({
      where: { 
        organizationId,
        ...(status ? { status: status as string } : {})
      },
      include: {
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(jobs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateJobPosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const data = req.body;

    const existing = await prisma.jobPosition.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Job position not found' });
    const job = await prisma.jobPosition.update({
      where: { id: existing.id },
      data
    });

    res.json(job);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ─── CANDIDATES & APPLICATIONS ───────────────────────────────────────────

export const applyForJob = async (req: Request, res: Response) => {
  try {
    const { jobPositionId, fullName, email, phone, resumeUrl, source, notes } = req.body;
    const job = await prisma.jobPosition.findFirst({
      where: { id: jobPositionId, status: 'OPEN' },
      select: { id: true, organizationId: true }
    });
    if (!job) return res.status(404).json({ error: 'Open job position not found' });
    const organizationId = job.organizationId;

    const candidate = await prisma.candidate.create({
      data: {
        organizationId,
        jobPositionId,
        fullName,
        email,
        phone,
        resumeUrl,
        source,
        notes,
        status: 'APPLIED'
      }
    });

    // Notify HR/MD
    const admins = await prisma.user.findMany({ 
      where: {
        organizationId,
        role: { in: ['MD', 'HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN'] },
        status: { not: 'TERMINATED' }
      },
      select: { id: true }
    });
    
    for (const admin of admins) {
      await notify(admin.id, 'New Applicant 📄', `New application from ${fullName} for a position.`, 'INFO', `/recruitment/candidates/${candidate.id}`);
    }

    res.status(201).json(candidate);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getCandidates = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const { jobPositionId, status } = req.query;

    const candidates = await prisma.candidate.findMany({
      where: {
        organizationId,
        ...(jobPositionId ? { jobPositionId: jobPositionId as string } : {}),
        ...(status ? { status: status as string } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(candidates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCandidateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    const existing = await prisma.candidate.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!existing) return res.status(404).json({ error: 'Candidate not found' });
    const candidate = await prisma.candidate.update({
      where: { id: existing.id },
      data: { status, notes }
    });

    res.json(candidate);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// ─── INTERVIEWS & STAGES ────────────────────────────────────────────────

export const scheduleInterview = async (req: Request, res: Response) => {
  try {
    const { candidateId, stage, scheduledAt, interviewerId } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const [candidate, interviewer] = await Promise.all([
      prisma.candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } }),
      interviewerId
        ? prisma.user.findFirst({ where: { id: interviewerId, organizationId, status: { not: 'TERMINATED' } }, select: { id: true } })
        : Promise.resolve(null),
    ]);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (interviewerId && !interviewer) return res.status(404).json({ error: 'Interviewer not found in this organization' });

    const interview = await prisma.$transaction(async (tx) => {
      const created = await tx.interviewStage.create({
        data: {
          organizationId,
          candidateId,
          stage,
          scheduledAt: new Date(scheduledAt),
          interviewerId
        }
      });
      await tx.candidate.update({
        where: { id: candidate.id },
        data: { status: 'INTERVIEW_SCHEDULED' }
      });
      return created;
    });

    if (interviewerId) {
      await notify(interviewerId, 'New Interview Assigned 📅', `You have been scheduled to interview a candidate for ${stage}.`, 'INFO', '/recruitment/interviews');
    }

    res.status(201).json(interview);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const submitInterviewFeedback = async (req: Request, res: Response) => {
  try {
    const { candidateId, interviewStageId, rating, feedback, recommendation } = req.body;
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const reviewerId = req.user?.id!;
    const [candidate, interviewStage] = await Promise.all([
      prisma.candidate.findFirst({ where: { id: candidateId, organizationId }, select: { id: true } }),
      interviewStageId
        ? prisma.interviewStage.findFirst({ where: { id: interviewStageId, candidateId, organizationId }, select: { id: true, interviewerId: true } })
        : Promise.resolve(null),
    ]);
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
    if (interviewStageId && !interviewStage) return res.status(404).json({ error: 'Interview stage not found' });
    const isHrReviewer = ['HR_DIRECTOR', 'HR_MANAGER', 'HR_OFFICER', 'HR', 'HR_ADMIN', 'MD', 'DEV'].includes(String(req.user?.role || '').toUpperCase());
    if (!interviewStage && !isHrReviewer) {
      return res.status(403).json({ error: 'An interview stage assignment is required to submit feedback' });
    }
    if (interviewStage && interviewStage.interviewerId !== reviewerId && !isHrReviewer) {
      return res.status(403).json({ error: 'Only the assigned interviewer or HR may submit feedback' });
    }

    const entry = await prisma.interviewFeedback.create({
      data: {
        organizationId,
        candidateId,
        interviewStageId,
        reviewerId,
        rating,
        feedback,
        recommendation
      }
    });

    res.status(201).json(entry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
