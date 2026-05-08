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

    const job = await prisma.jobPosition.update({
      where: { id },
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
    const organizationId = req.body.organizationId || 'mcb-ghana-tenant'; // Public apply might not have req.user

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
      where: { role: { in: ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER'] } },
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

    const candidate = await prisma.candidate.update({
      where: { id },
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

    const interview = await prisma.interviewStage.create({
      data: {
        organizationId,
        candidateId,
        stage,
        scheduledAt: new Date(scheduledAt),
        interviewerId
      }
    });

    // Update candidate status
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { status: 'INTERVIEW_SCHEDULED' }
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
