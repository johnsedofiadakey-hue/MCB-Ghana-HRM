import { Request, Response } from 'express';
import { PolicyService } from '../services/policy.service';

export class PolicyController {
  static async simulate(req: Request, res: Response) {
    try {
      const { userId, permission, context } = req.body;

      if (!userId || !permission) {
        return res.status(400).json({ error: 'userId and permission are required' });
      }

      const result = await PolicyService.evaluatePolicy(userId, permission, context || {});

      return res.json({
        userId,
        permission,
        allowed: result.allowed,
        reason: result.reason,
      });
    } catch (error: any) {
      console.error('[Policy Controller] Simulation Error:', error);
      return res.status(500).json({ error: 'Internal server error during simulation' });
    }
  }
}
