import { Router } from 'express';
import prisma from '../prisma/client';

const router = Router();

router.get('/env', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const settings = await prisma.systemSettings.findFirst();
    res.json({
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      version: '2.2.0',
      databaseType: 'postgresql',
      userCount,
      maintenance: settings,
      headers: req.headers,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/firebase-check', (req, res) => {
  const pk = process.env.FIREBASE_PRIVATE_KEY || '';
  res.json({
    projectId: !!process.env.FIREBASE_PROJECT_ID,
    clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    pkLength: pk.length,
    pkStart: pk.substring(0, 20), // Show start to check for "---BEGIN"
    pkIncludesNewlines: pk.includes('\n'),
    pkIncludesEscapedNewlines: pk.includes('\\n'),
    isInitialized: require('../config/firebase.config').getBucket() !== null
  });
});

import { authenticate } from '../middleware/auth.middleware';

router.get('/whoami', authenticate, (req, res) => {
  res.json({
    user: (req as any).user,
    authHeader: req.headers.authorization ? 'Present' : 'Missing',
    path: req.path
  });
});

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, role: true, organizationId: true, fullName: true }
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { getRoleRank } from '../middleware/auth.middleware';
import { ROLE_RANK_MAP } from '../types/roles';

router.get('/inspect-user/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true, status: true, fullName: true, organizationId: true, leaveBalance: true, leaveAllowance: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const rank = getRoleRank(user.role);
    res.json({
      ...user,
      rank,
      isOrgMissing: !user.organizationId && user.role !== 'DEV'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { errorLogger } from '../services/error-log.service';

router.get('/errors', (req, res) => {
  res.json(errorLogger.getErrors());
});

export default router;
