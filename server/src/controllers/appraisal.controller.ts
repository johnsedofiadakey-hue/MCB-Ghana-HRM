import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AppraisalService } from '../services/appraisal.service';
import { getOrgId } from './enterprise.controller';
import { getRoleRank } from '../middleware/auth.middleware';
// Local helper

import { logAction } from '../services/audit.service';

export const initAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    if (getRoleRank(userRole) < 85) {
      return res.status(403).json({ error: 'Only HR Managers or MD can initialize appraisal cycles' });
    }
    const organizationId = getOrgId(req) || 'default-tenant';
    const result = await AppraisalService.initCycle(organizationId, req.body);
    
    await logAction((req as any).user.id, 'APPRAISAL_CYCLE_INIT', 'AppraisalCycle', result.cycle.id, {}, req.ip);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const submitAppraisalReview = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const userRank = getRoleRank((req as any).user.role);
    const userDeptId = (req as any).user.departmentId;
    const review = await AppraisalService.submitReview(packetId, userId, organizationId, { ...req.body, userRank, userDeptId });
    
    await logAction(userId, 'APPRAISAL_REVIEW_SUBMITTED', 'AppraisalReview', review.id, { packetId }, req.ip);
    return res.json(review);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getPacketDetail = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const userRank = getRoleRank(userRole);
    
    const packet = await AppraisalService.getPacketDetail(packetId, userId, organizationId, userRank);
    if (!packet) return res.status(404).json({ error: 'Appraisal packet not found' });
    
    return res.json(packet);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyPackets = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const packets = await AppraisalService.getEmployeePackets(userId, organizationId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTeamPackets = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;
    const userRank = getRoleRank((req as any).user.role);
    const packets = await AppraisalService.getReviewerPackets(userId, organizationId, userRank);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getFinalVerdictList = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const packets = await AppraisalService.getFinalVerdictList(organizationId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const finalSignOff = async (req: Request, res: Response) => {
  try {
    const { packetId, finalVerdict, finalScore, arbitrationLogic, assignedTargets } = req.body;
    const organizationId = getOrgId(req) || 'default-tenant';
    const user = (req as any).user;
    
    // Only HR Manager or higher (Rank 85+) can perform final signoff
    if (getRoleRank(user.role) < 85) {
      return res.status(403).json({ error: 'Only HR Managers or MD can perform final appraisal sign-off' });
    }
    
    const packet = await AppraisalService.finalizePacket(packetId, user.id, organizationId, finalVerdict, finalScore, arbitrationLogic, assignedTargets);
    
    await logAction(user.id, 'APPRAISAL_FINALIZED', 'AppraisalPacket', packet.id, { arbitrationLogic, targetCount: assignedTargets?.length || 0 }, req.ip);
    return res.json(packet);

  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

// Cancel/void an appraisal packet (Director+ only)
export const cancelAppraisalPacket = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    
    const packet = await (prisma as any).appraisalPacket.findUnique({
      where: { id: packetId, organizationId }
    });
    if (!packet) return res.status(404).json({ error: 'Packet not found' });
    
    await (prisma as any).appraisalPacket.update({
      where: { id: packetId },
      data: { status: 'CANCELLED', currentStage: 'CANCELLED' }
    });
    
    await logAction((req as any).user.id, 'APPRAISAL_CANCELLED', 'AppraisalPacket', packetId, {}, req.ip);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const cycle = await AppraisalService.updateCycle(organizationId, id, req.body);
    return res.json(cycle);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteAppraisalCycle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    await AppraisalService.deleteCycle(organizationId, id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};
export const updateAppraisalPacket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userRole = (req as any).user.role;
    
    // Only Director+ can modify active packets
    if (getRoleRank(userRole) < 80) {
      return res.status(403).json({ error: 'Not authorised to modify appraisal packets' });
    }
    
    const packet = await AppraisalService.updatePacket(organizationId, id, req.body);
    return res.json(packet);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const deleteAppraisalPacket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userRole = (req as any).user.role;

    if (getRoleRank(userRole) < 80) {
      return res.status(403).json({ error: 'Not authorised to delete appraisal packets' });
    }

    await AppraisalService.deletePacket(organizationId, id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const raiseAppraisalDispute = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const { reason } = req.body;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;

    const packet = await AppraisalService.raiseDispute(packetId, userId, organizationId, reason);
    await logAction(userId, 'APPRAISAL_DISPUTE_RAISED', 'AppraisalPacket', packetId, { reason }, req.ip);
    
    return res.json(packet);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const resolveAppraisalDispute = async (req: Request, res: Response) => {
  try {
    const { packetId } = req.params;
    const { resolution, finalScore, finalVerdict } = req.body;
    const organizationId = getOrgId(req) || 'default-tenant';
    const userId = (req as any).user.id;

    // Only HR/MD (Rank 85+) can resolve
    if (getRoleRank((req as any).user.role) < 85) {
      return res.status(403).json({ error: 'Not authorised to resolve appraisal disputes' });
    }

    const packet = await AppraisalService.resolveDispute(packetId, userId, organizationId, resolution, finalScore, finalVerdict);
    await logAction(userId, 'APPRAISAL_DISPUTE_RESOLVED', 'AppraisalPacket', packetId, { resolution, finalScore }, req.ip);
    
    return res.json(packet);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
};

export const getCyclePackets = async (req: Request, res: Response) => {
  try {
    const { cycleId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const packets = await AppraisalService.getCyclePackets(organizationId, cycleId);
    return res.json(packets);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
export const purgeOrphanPackets = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const userRole = (req as any).user.role;
    
    // Only HR Manager or MD (Rank 85+) can trigger purge
    if (getRoleRank(userRole) < 85) {
      return res.status(403).json({ error: 'Not authorised to perform data purges' });
    }
    
    const result = await AppraisalService.cleanupOrphanedPackets(organizationId);
    return res.json({ 
      success: true, 
      message: result.message,
      count: result.count
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
export const resetAppraisalDomain = async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req) || 'default-tenant';
    const userRole = (req as any).user.role;
    
    // ONLY MD (Rank 90+) can perform a Factory Reset
    if (getRoleRank(userRole) < 90) {
      return res.status(403).json({ error: 'CRITICAL ACCESS DENIED: Only the Managing Director can perform a Factory Reset.' });
    }
    
    const result = await AppraisalService.ultimateReset(organizationId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getPerformanceTrend = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const organizationId = getOrgId(req) || 'default-tenant';
    const trend = await AppraisalService.getEmployeePerformanceTrend(employeeId, organizationId);
    return res.json(trend);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

