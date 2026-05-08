import { Request, Response, NextFunction } from 'express';
import prisma from '../prisma/client';

<<<<<<< HEAD
const logBuffer: any[] = [];
const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 30000; // 30 seconds

const flushLogs = async () => {
  if (logBuffer.length === 0) return;
  
  const logsToFlush = [...logBuffer];
  logBuffer.length = 0; // Clear buffer

  try {
    // 🛡️ PERFORMANCE FIX: Batch write logs to the database
    await (prisma as any).apiUsage.createMany({
      data: logsToFlush,
      skipDuplicates: true
    });
  } catch (error) {
    console.error('[Telemetry Batch Flush Error]:', error);
  }
};

// Periodic flush
setInterval(flushLogs, FLUSH_INTERVAL);

=======
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
export const apiUsageMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = (req as any).user;
    
<<<<<<< HEAD
    logBuffer.push({
      organizationId: user?.organizationId || 'PUBLIC',
      method: req.method,
      path: req.baseUrl + req.path,
      statusCode: res.statusCode,
      duration: duration,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (logBuffer.length >= BATCH_SIZE) {
      flushLogs();
    }
=======
    // Fire-and-forget: we don't await the DB write here to ensure zero impact on event loop responsiveness 
    (prisma as any).apiUsage.create({
      data: {
        organizationId: user?.organizationId || 'PUBLIC',
        method: req.method,
        path: req.baseUrl + req.path,
        statusCode: res.statusCode,
        duration: duration,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    }).catch((error: any) => {
      // Fail silently to not disrupt the main request flow
      console.error('[Telemetry Error]:', error);
    });
>>>>>>> 430a1da1a47c271c0801ba6d3e2fad6da5b864e7
  });

  next();
};
