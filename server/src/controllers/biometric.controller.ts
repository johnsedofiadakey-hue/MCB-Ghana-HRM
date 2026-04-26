import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../utils/logger';

/**
 * Biometric Synchronization Controller
 * Handles real-time push data from hardware devices (ZKTeco, Hikvision, etc.)
 */
export const pushBiometricLogs = async (req: Request, res: Response) => {
  try {
    const { syncKey, logs } = req.body;

    // Verify System Sync Key
    const VALID_SYNC_KEY = 'NX-BIO-SYNC-8562-XK92';
    if (syncKey !== VALID_SYNC_KEY) {
      return res.status(401).json({ error: 'Invalid synchronization key.' });
    }

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: 'Invalid log format. Expected array.' });
    }

    console.log(`[Biometric Hub] Received ${logs.length} logs for processing.`);

    const results = await Promise.all(logs.map(async (log: any) => {
      const { biometricId, timestamp, type } = log; // type: 'CLOCK_IN' | 'CLOCK_OUT'

      // Map biometricId to User
      const user = await prisma.user.findFirst({
        where: { biometricId: String(biometricId), isArchived: false }
      });

      if (!user) {
         return { biometricId, status: 'SKIPPED', reason: 'User identity not found' };
      }

      // Create Attendance Log
      const attendance = await prisma.attendanceLog.create({
        data: {
          organizationId: user.organizationId,
          employeeId: user.id,
          timestamp: new Date(timestamp),
          type: type || 'CLOCK_IN',
          source: 'BIOMETRIC_DEVICE',
          location: 'Main Entrance'
        }
      });

      return { biometricId, status: 'SUCCESS', logId: attendance.id };
    }));

    res.json({
      status: 'SUCCESS',
      message: 'Synchronization cycle completed.',
      processed: results.length,
      details: results
    });

  } catch (error: any) {
    console.error('[Biometric Hub] Fault:', error.message);
    res.status(500).json({ error: 'Synchronization engine failure.' });
  }
};
