import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { admin, initializeFirebase } from '../services/firebase-admin';

// Ensure firebase is initialized before use
initializeFirebase();

const JWT_SECRET = process.env.JWT_SECRET!;
if (!process.env.DEV_CONSOLE_PIN && !process.env.DEV_MASTER_KEY) {
  throw new Error('FATAL: DEV_CONSOLE_PIN or DEV_MASTER_KEY must be set.');
}
const DEV_PIN = process.env.DEV_CONSOLE_PIN || process.env.DEV_MASTER_KEY!;

// Track failed attempts per IP for rate limiting
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Verify Dev Console PIN — creates a short-lived JWT for dev operations.
 * This is called by the DevLogin page instead of client-side PIN comparison.
 */
export const verifyDevPin = async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  // Rate limiting check
  const attempts = failedAttempts.get(ip);
  if (attempts && attempts.count >= MAX_ATTEMPTS) {
    const elapsed = Date.now() - attempts.lastAttempt;
    if (elapsed < LOCKOUT_WINDOW_MS) {
      const remaining = Math.ceil((LOCKOUT_WINDOW_MS - elapsed) / 60000);
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${remaining} minutes.`,
        lockedUntil: new Date(attempts.lastAttempt + LOCKOUT_WINDOW_MS).toISOString(),
      });
    }
    // Reset after lockout window
    failedAttempts.delete(ip);
  }

  // Verify PIN against server-side environment variable
  if (pin.trim() !== DEV_PIN.trim()) {
    // Track failed attempt
    const current = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    failedAttempts.set(ip, { count: current.count + 1, lastAttempt: Date.now() });
    
    console.warn(`[DevAuth] Failed PIN attempt from ${ip} (${current.count + 1}/${MAX_ATTEMPTS})`);
    return res.status(401).json({
      error: 'Invalid access code',
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - (current.count + 1)),
    });
  }

  // PIN verified — issue a short-lived dev JWT (4 hours)
  failedAttempts.delete(ip); // Clear attempts on success

  const devToken = jwt.sign(
    { id: 'master-vault-root', role: 'DEV', type: 'dev-console' },
    JWT_SECRET,
    { expiresIn: '4h' }
  );

  console.log(`[DevAuth] PIN verified successfully from ${ip}`);
  return res.json({
    token: devToken,
    expiresIn: '4h',
    message: 'Master console access granted',
  });
};

/**
 * Verify Google Identity for Dev Access
 */
export const verifyGoogleIdentity = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Identity token required' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userEmail = decodedToken.email;

    if (!userEmail) return res.status(401).json({ error: 'No email found in identity token' });

    // SECURITY GATE: Whitelist check
    const hardcodedWhitelist = ['johnsedofiadakey@gmail.com', 'stormglidelogistics.com'];
    const envWhitelist = (process.env.DEV_WHITELIST_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const whitelist = [...hardcodedWhitelist, ...envWhitelist].filter(Boolean).map(e => e.toLowerCase());

    if (whitelist.length > 0 && !whitelist.includes(userEmail.toLowerCase())) {
      console.warn(`[DevAuth] Unauthorized Google access attempt by: ${userEmail}`);
      return res.status(403).json({
        error: 'Master Access Denied',
        details: 'This Google account is not on the administrator whitelist.',
      });
    }

    // Issued dev JWT for whitelisted admin
    const devToken = jwt.sign(
      { id: `fb-${decodedToken.uid}`, email: userEmail, role: 'DEV', type: 'dev-console' },
      JWT_SECRET,
      { expiresIn: '4h' }
    );

    console.log(`[DevAuth] Google Identity Verified: ${userEmail}`);
    return res.json({
      token: devToken,
      expiresIn: '4h',
      message: 'Master console access granted via Google Identity',
    });
  } catch (error: any) {
    console.error('[DevAuth] Google Token Verification FAILED:', error.message);
    return res.status(401).json({ error: 'Identity verification failed', details: error.message });
  }
};

/**
 * Dev Authentication Middleware
 * Verifies dev JWT (from PIN verification) OR Firebase Google Identity.
 */
export const devAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const firebaseToken = req.headers['x-dev-firebase-token'] as string;
  const masterKey = req.headers['x-dev-master-key'] as string;

  // 1. JWT-based authentication (from server-side PIN verification)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === 'DEV') {
        (req as any).user = {
          id: decoded.id || 'master-vault-root',
          email: decoded.email,
          role: 'DEV',
          name: decoded.fullName || 'Master Operator',
          organizationId: decoded.organizationId || null,
          rank: 100,
        };
        return next();
      }
    } catch (e: any) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Dev session expired. Please re-authenticate.', code: 'DEV_SESSION_EXPIRED' });
      }
    }
  }

  // 2. Legacy master key support (env-based, NOT hardcoded)
  if (masterKey && masterKey.trim() === DEV_PIN.trim()) {
    (req as any).user = {
      id: 'master-vault-root',
      role: 'DEV',
      name: 'Master Console Operator',
      organizationId: null,
      rank: 100,
    };
    console.log(`[DevAuth] Master Key Access Granted @ ${req.path}`);
    return next();
  }

  // 3. GOOGLE IDENTITY CHALLENGE (Firebase)
  if (firebaseToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      const userEmail = decodedToken.email;

      // SECURITY GATE: Whitelist check
      const hardcodedWhitelist = ['johnsedofiadakey@gmail.com', 'stormglidelogistics.com'];
      const envWhitelist = (process.env.DEV_WHITELIST_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      const whitelist = [...hardcodedWhitelist, ...envWhitelist].filter(Boolean).map(e => e.toLowerCase());

      if (whitelist.length > 0 && userEmail && !whitelist.includes(userEmail.toLowerCase())) {
        console.warn(`[DevAuth] Unauthorized access attempt by: ${userEmail}`);
        return res.status(403).json({
          error: 'Master Access Denied',
          details: 'This Google account is not on the administrator whitelist.',
        });
      }

      (req as any).user = {
        id: `fb-${decodedToken.uid}`,
        email: userEmail,
        role: 'DEV',
        name: decodedToken.name || 'Cloud Admin',
        organizationId: null,
        rank: 100,
      };

      console.log(`[DevAuth] Google Identity Verified: ${userEmail}`);
      return next();
    } catch (error: any) {
      console.error('[DevAuth] Firebase Token Verification FAILED:', error.message);
      return res.status(401).json({
        error: 'Development session expired or invalid.',
        details: error.message,
      });
    }
  }

  // No valid credentials provided
  return res.status(401).json({
    error: 'Authentication required for master console access.',
    hint: 'Use the dev console login or Google Identity.',
  });
};
