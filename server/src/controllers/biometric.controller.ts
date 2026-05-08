import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { logAction } from '../services/audit.service';

interface Punch {
  biometricId: string;
  timestamp: string;
  type?: 'CHECKIN' | 'CHECKOUT' | 'PUNCH';
}

/**
 * Biometric Synchronization Controller
 * Handles batch uploads from physical devices or bridge scripts.
 */
export const syncPunches = async (req: Request, res: Response) => {
  try {
    const { punches, organizationId: bodyOrgId } = req.body as { punches: Punch[]; organizationId?: string };
    
    // Multi-tenancy: prioritize orgId from auth user, fallback to body
    const userRole = (req as any).user?.role;
    const organizationId = (req as any).user?.organizationId || bodyOrgId || 'mcb-ghana-tenant';

    // Verification: Only Admin/MD/Developer can sync
    if (userRole && !['MD', 'DEV', 'HR', 'IT_ADMIN', 'IT_MANAGER'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions for biometric sync.' });
    }

    if (!punches || !Array.isArray(punches)) {
      return res.status(400).json({ error: 'Invalid payload: "punches" array is required.' });
    }

    const results = {
      processed: 0,
      errors: 0,
      skipped: 0,
      details: [] as string[]
    };

    for (const punch of punches) {
      try {
        const { biometricId, timestamp, type = 'PUNCH' } = punch;
        const punchDate = new Date(timestamp);
        const normalizedDate = new Date(punchDate);
        normalizedDate.setHours(0, 0, 0, 0);

        // 1. Find the employee
        const employee = await prisma.user.findFirst({
          where: { biometricId: biometricId.toString(), organizationId }
        });

        if (!employee) {
          results.skipped++;
          results.details.push(`User not found for biometricId: ${biometricId}`);
          continue;
        }

        // 2. Find or Create Attendance Log for the day
        const existingLog = await prisma.attendanceLog.findUnique({
          where: {
            employeeId_date: {
              employeeId: employee.id,
              date: normalizedDate
            }
          }
        });

        if (!existingLog) {
          await prisma.attendanceLog.create({
            data: {
              organizationId,
              employeeId: employee.id,
              date: normalizedDate,
              clockIn: punchDate,
              source: 'BIOMETRIC',
              status: 'PRESENT'
            }
          });
        } else {
          const updateData: any = { source: 'BIOMETRIC' };
          
          if (type === 'CHECKIN' || (!existingLog.clockIn && type === 'PUNCH')) {
            updateData.clockIn = punchDate;
          } else if (type === 'CHECKOUT' || (existingLog.clockIn && type === 'PUNCH')) {
            if (!existingLog.clockIn || punchDate > existingLog.clockIn) {
               updateData.clockOut = punchDate;
            }
          }

          await prisma.attendanceLog.update({
            where: { id: existingLog.id },
            data: updateData
          });
        }

        results.processed++;
      } catch (err: any) {
        results.errors++;
        results.details.push(`Error processing punch for ${punch.biometricId}: ${err.message}`);
      }
    }

    return res.json({
      message: 'Sync completed',
      ...results
    });

  } catch (error: any) {
    console.error('[BiometricSync] Fatal error:', error);
    return res.status(500).json({ error: 'Internal Server Error during sync.' });
  }
};

export const kioskPunch = async (req: Request, res: Response) => {
  try {
    const { employeeCode, type } = req.body;
    const organizationId = req.body.organizationId || 'mcb-ghana-tenant';

    if (!employeeCode || !type) {
       return res.status(400).json({ error: 'employeeCode and type (CHECKIN/CHECKOUT) are required.' });
    }

    const employee = await prisma.user.findFirst({
      where: { employeeCode, organizationId, status: 'ACTIVE' }
    });

    if (!employee) {
       return res.status(404).json({ error: 'Invalid Employee Code.' });
    }

    const punchDate = new Date();
    const normalizedDate = new Date(punchDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const existingLog = await prisma.attendanceLog.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: normalizedDate
        }
      }
    });

    if (!existingLog) {
      if (type === 'CHECKOUT') {
         return res.status(400).json({ error: 'Cannot checkout without an active clock-in today.' });
      }

      await prisma.attendanceLog.create({
        data: {
          organizationId,
          employeeId: employee.id,
          date: normalizedDate,
          clockIn: punchDate,
          source: 'KIOSK',
          status: 'PRESENT'
        }
      });
      return res.json({ message: 'Successfully Clocked In', user: employee.fullName, timestamp: punchDate });
    } else {
      if (type === 'CHECKIN') {
         return res.status(400).json({ error: 'You are already clocked in for today.' });
      }

      if (existingLog.clockOut) {
         return res.status(400).json({ error: 'You have already clocked out for today.' });
      }

      await prisma.attendanceLog.update({
        where: { id: existingLog.id },
        data: { clockOut: punchDate, source: 'KIOSK' }
      });
      
      return res.json({ message: 'Successfully Clocked Out', user: employee.fullName, timestamp: punchDate, durationMinutes: Math.round((punchDate.getTime() - existingLog.clockIn!.getTime()) / 60000) });
    }

  } catch (error: any) {
    console.error('[KioskPunch] error:', error);
    return res.status(500).json({ error: 'Kiosk malfunction.' });
  }
};

/**
 * Real-time Biometric Push Gateway
 * Specifically designed for hardware device webhooks (ADMS / Cloud Sync)
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
      return res.status(400).json({ error: 'Invalid log format. Expected array of { biometricId, timestamp, type }.' });
    }

    console.log(`[Biometric Gateway] Received push request with ${logs.length} events.`);

    const results = await Promise.all(logs.map(async (log: any) => {
      const { biometricId, timestamp, type } = log; // type: 'CLOCK_IN' | 'CLOCK_OUT' | 'CHECKIN' | 'CHECKOUT'
      
      const punchDate = new Date(timestamp);
      const normalizedDate = new Date(punchDate);
      normalizedDate.setHours(0, 0, 0, 0);

      // 1. Find User by Biometric ID
      const user = await prisma.user.findFirst({
        where: { biometricId: String(biometricId), isArchived: false }
      });

      if (!user) {
         return { biometricId, status: 'SKIPPED', reason: 'Identity not recognized' };
      }

      // 2. Map Push Types to Schema Fields
      const isCheckIn = ['CLOCK_IN', 'CHECKIN'].includes(type);
      const isCheckOut = ['CLOCK_OUT', 'CHECKOUT'].includes(type);

      // 3. Upsert Attendance Record
      const existing = await prisma.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId: user.id, date: normalizedDate } }
      });

      if (!existing) {
        // Initial log for the day
        await prisma.attendanceLog.create({
          data: {
            organizationId: user.organizationId,
            employeeId: user.id,
            date: normalizedDate,
            clockIn: isCheckIn ? punchDate : undefined,
            clockOut: isCheckOut ? punchDate : undefined,
            source: 'HARDWARE_PUSH',
            status: 'PRESENT'
          }
        });
      } else {
        // Update existing log
        const data: any = { source: 'HARDWARE_PUSH' };
        if (isCheckIn) data.clockIn = punchDate;
        if (isCheckOut) data.clockOut = punchDate;

        await prisma.attendanceLog.update({
          where: { id: existing.id },
          data
        });
      }

      return { biometricId, employee: user.fullName, status: 'SYNCED' };
    }));

    res.json({
      status: 'SUCCESS',
      processed: results.length,
      details: results
    });

  } catch (error: any) {
    console.error('[Biometric Push] Critical fault:', error.stack);
    res.status(500).json({ error: 'Synchronization gateway malfunction.' });
  }
};
