import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { ROLE_RANK_MAP } from '../types/roles';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[DemoController] JWT_SECRET not configured');
}
const ACCESS_TOKEN_TTL = '2h'; // Demo sessions are short-lived

const getRoleRank = (role?: string): number => {
  if (!role) return 0;
  return ROLE_RANK_MAP[role.toUpperCase()] ?? 0;
};

const getClientMeta = (req: Request) => ({
  ipAddress: req.ip || req.socket.remoteAddress || null,
  userAgent: req.get('user-agent') || null,
});

/**
 * ISSUES A SILENT DEMO HANDSHAKE
 * Allows marketing visitors to enter as specific roles without credentials.
 */
export const demoLogin = async (req: Request, res: Response) => {
  try {
    const { role } = req.body as { role: 'MD' | 'MANAGER' | 'STAFF' };
    const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || 'acme-ghana-demo-001';

    const roleMap = {
      MD: { email: 'demo.md@nexus-demo.com', rank: 90, title: 'Managing Director' },
      MANAGER: { email: 'demo.manager@nexus-demo.com', rank: 70, title: 'Operations Manager' },
      STAFF: { email: 'demo.staff@nexus-demo.com', rank: 50, title: 'Senior Executive' },
    };

    const config = roleMap[role];
    if (!config) {
      return res.status(400).json({ error: 'Invalid demonstration role requested.' });
    }

    // Resolve or Auto-Provision the Demo Identity
    let user = await prisma.user.findUnique({
      where: { email: config.email }
    });

    if (!user) {
      // If the seeder hasn't run yet, we force a minimal identity to prevent blocking the visitor
      user = await prisma.user.create({
        data: {
          email: config.email,
          fullName: role === 'MD' ? 'John Mensah' : (role === 'MANAGER' ? 'Ama Owusu' : 'Kwame Asante'),
          role: role,
          jobTitle: config.title,
          status: 'ACTIVE',
          organizationId: DEMO_TENANT_ID,
          passwordHash: 'DEMO_IDENTITY_NO_PASSWORD', // Credentials not used for this path
        }
      });
    }

    // Issue Restricted Identity Token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.fullName,
        status: user.status,
        organizationId: DEMO_TENANT_ID,
        isDemo: true, // Critical: Triggers read-only / banner state in frontend
        demoExpiredAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hour lifespan
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // native simple refresh token for demo longevity within the 2 hour window
    const refreshToken = crypto.randomBytes(48).toString('hex');

    return res.status(200).json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle,
        rank: getRoleRank(user.role),
        organizationId: DEMO_TENANT_ID,
        isDemo: true,
      },
      redirectUrl: '/dashboard'
    });

  } catch (error: any) {
    console.error('[DemoLogin] Execution Fault:', error);
    return res.status(500).json({ error: 'The demonstration engine is currently undergoing maintenance. Please try again in a few minutes.' });
  }
};
