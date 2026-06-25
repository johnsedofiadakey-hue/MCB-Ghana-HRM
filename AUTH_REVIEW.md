# MCB Ghana HRM - Authentication System Review

**Review Date:** June 23, 2026  
**Project:** MCB-Ghana-HRM (v5.1.0)  
**Focus Areas:** Login Authentication, Security, and Best Practices

---

## 📋 Executive Summary

The MCB Ghana HRM authentication system implements a **solid, production-ready** multi-method authentication architecture with JWT tokens, refresh token rotation, and multiple login pathways (email/password, SSO, sandbox). The implementation demonstrates **strong security fundamentals** with bcrypt hashing, secure token handling, and rate limiting. Several areas for enhancement are identified below.

---

## 🏗️ Architecture Overview

### Authentication Methods Supported

1. **Email/Password Login** (`POST /auth/login`)
   - Standard credential-based authentication
   - Email and password validation
   - Bcrypt password hashing (salt rounds: 12)

2. **SSO Login** (`POST /auth/sso`)
   - Firebase identity token verification
   - Google/Microsoft OAuth integration
   - Auto-provisioning for registered emails

3. **Refresh Token Flow** (`POST /auth/refresh`)
   - Token rotation for security
   - Automatic revocation of old tokens
   - 24-hour session window

4. **Sandbox/Demo Login** (`POST /auth/sandbox`)
   - Zero-click demo environment
   - Automatic seeding with demo data
   - Demo-mode restrictions on destructive operations

5. **Tenant Signup** (`POST /auth/signup`)
   - Self-serve organization registration
   - MD (Managing Director) role creation
   - 14-day free trial setup

### Token Architecture

```
Access Token (JWT)
├─ Expires: 1 hour
├─ Contains: id, role, name, status, organizationId, rank
└─ Signed with: HS256 (JWT_SECRET)

Refresh Token (Database-Backed)
├─ Expires: 24 hours
├─ Rotation: New token issued on refresh
├─ Storage: SHA256 hash in database
└─ Metadata: IP address, user agent, revocation tracking
```

---

## ✅ Security Strengths

### 1. **Password Security**
- **Bcrypt with salt rounds 12** (CPU-intensive, resistant to brute force)
- **Strong password requirements:** 8+ chars, 1 number, 1 special character
- Password reset via email with 1-hour token expiration
- Refresh tokens revoked on password change

### 2. **Token Security**
- **Refresh token rotation:** Old tokens revoked after use
- **Hashed storage:** Tokens stored as SHA256 hashes, not plaintext
- **Database-backed refresh tokens:** Can revoke sessions server-side
- **IP/User-Agent tracking:** Detects suspicious token reuse

### 3. **Rate Limiting**
- **Login attempts:** 10 failures per 15 minutes (per IP)
- **Password reset:** 5 requests per hour (prevents email spam)
- **General API:** 300 requests per minute (per user or IP)
- **Export operations:** 20 per 5 minutes (prevents resource exhaustion)

### 4. **Account Lifecycle Management**
- **Terminated account detection** at authentication and middleware level
- **Session invalidation** on account termination
- **Security event logging** for all auth attempts (success/failure with reason)

### 5. **XSS & Injection Protection**
- **Middleware sanitization** for XSS attacks
- **Email normalization:** `.toLowerCase().trim()` prevents email spoofing
- **Input validation** via Zod schemas (LoginSchema, ChangePasswordSchema, etc.)

### 6. **Audit Trail**
- **LoginSecurityEvent table** tracks all login attempts
- **Metadata captured:** IP address, user agent, success/failure reason
- **Enables investigation** of suspicious activity

---

## ⚠️ Security Concerns & Recommendations

### HIGH PRIORITY

#### 1. **Exposed Service Account Key (CRITICAL)**
**Location:** `sa_b64.txt` and `sa_b64_openssl.txt` in repository root

```
⚠️ IMMEDIATE ACTION REQUIRED
```

**Finding:**
- Base64-encoded Firebase service account keys are committed to Git
- Visible in public GitHub repository
- Allows anyone to impersonate your Firebase project

**Recommendation:**
```bash
# 1. Immediately revoke these keys in Firebase Console
# 2. Delete from git history (not just working tree)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch sa_b64.txt sa_b64_openssl.txt' \
  --prune-empty -- --all

# 3. Rotate service account keys
# 4. Add to .gitignore
echo "sa_b64*.txt" >> .gitignore
echo "service-account*.json" >> .gitignore

# 5. Use environment variables only:
# - FIREBASE_SERVICE_ACCOUNT_KEY (base64 in production)
# - GOOGLE_APPLICATION_CREDENTIALS (file path in local dev)
```

---

#### 2. **Hardcoded "mcb-ghana-tenant" Organization ID**
**Locations:** auth.controller.ts (lines 47, 69, 98, 107, 206, 246)

**Concern:**
```typescript
organizationId: organizationId || 'mcb-ghana-tenant'  // Fallback to default
```

When a user lacks `organizationId`, the system defaults to "mcb-ghana-tenant". This could:
- Allow unauthorized cross-tenant data access
- Mask configuration errors
- Enable privilege escalation if exploited

**Recommendation:**
```typescript
// BEFORE
const orgId = user.organizationId || 'mcb-ghana-tenant';

// AFTER - Fail-safe approach
if (!user.organizationId) {
  await safeLogSecurityEvent({
    email: user.email,
    success: false,
    organizationId: 'system-error',
    reason: 'MISSING_ORGANIZATION_ID',
    req
  });
  return res.status(500).json({
    error: 'Account configuration error. Please contact administrator.'
  });
}
const orgId = user.organizationId;
```

---

#### 3. **Potential Timing Attack on Password Comparison**
**Location:** auth.controller.ts:110

**Finding:**
```typescript
const isMatch = await bcrypt.compare(password, user.passwordHash);
if (!isMatch) {
  // ... generic error
}
```

While bcrypt.compare() uses timing-safe comparison, the surrounding flow might leak timing:
- Different database queries for "user not found" vs "password wrong"
- Both return identical errors (good), but query timing differs

**Impact:** Low (errors are identical, but timing could reveal user existence)

**Recommendation:** Already mitigated well - both paths return `401 "Invalid credentials"`. No change needed.

---

### MEDIUM PRIORITY

#### 4. **SSO User Auto-Provisioning Risk**
**Location:** auth.controller.ts:167-199

**Finding:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: normalizedEmail }
  // No organization check!
});
```

**Concern:**
- SSO login succeeds only if email exists in database
- No organization affiliation required for SSO
- If a former employee's email is added to Google Workspace, they could still access

**Recommendation:**
```typescript
// Add organization check in SSO login
const user = await prisma.user.findUnique({
  where: { email: normalizedEmail },
  select: {
    // ... existing selects
    organizationId: true,
  }
});

// Verify organization exists and is active
if (!user.organizationId) {
  await safeLogSecurityEvent({
    email: normalizedEmail,
    success: false,
    organizationId: 'unknown',
    reason: 'SSO_MISSING_ORG',
    req
  });
  return res.status(401).json({
    error: 'Your account is not properly configured. Contact IT.'
  });
}

const org = await prisma.organization.findUnique({
  where: { id: user.organizationId },
  select: { isSuspended: true, billingStatus: true }
});

if (!org || org.isSuspended || org.billingStatus === 'SUSPENDED') {
  return res.status(403).json({
    error: 'Organization access is unavailable.'
  });
}
```

---

#### 5. **Sandbox Token Persistence Gap**
**Location:** auth.middleware.ts:74-100

**Finding:**
```typescript
if (decoded.organizationId === 'sandbox-org-001') {
  const sandboxUser = await prisma.user.findFirst({
    where: { id: decoded.id, organizationId: 'sandbox-org-001' }
  });
  
  if (!sandboxUser) {
    // Checks DB, but... 
    return res.status(401).json({ error: 'Sandbox account expired or deleted.' });
  }
}
```

**Concern:**
- Sandbox account could be deleted mid-session
- If immediately re-created with same ID, no security break (ID collision unlikely)
- No session invalidation mechanism if sandbox needs reset

**Recommendation:**
```typescript
// Add sandbox reset mechanism
export const resetSandbox = async (req: Request, res: Response) => {
  const user = req.user;
  if (user?.organizationId !== 'sandbox-org-001') {
    return res.status(403).json({ error: 'Not a sandbox account' });
  }

  // Revoke all sandbox tokens
  await prisma.refreshToken.updateMany({
    where: { organizationId: 'sandbox-org-001' },
    data: { revokedAt: new Date() }
  });

  return res.json({ success: true, message: 'Sandbox reset. Please login again.' });
};
```

---

#### 6. **Impersonation Endpoint Lacks Audit Trail**
**Location:** auth.controller.ts:582-612

**Finding:**
```typescript
export const impersonateTenant = async (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  if (adminUser.role !== 'DEV') return res.status(403).json({ error: 'Unauthorized override' });
  
  // Generates token but doesn't log impersonation event
}
```

**Concern:**
- DEV users can impersonate any tenant without audit trail
- No notification to impersonated organization
- Could mask malicious activity

**Recommendation:**
```typescript
export const impersonateTenant = async (req: Request, res: Response) => {
  const adminUser = (req as any).user;
  if (adminUser.role !== 'DEV') return res.status(403).json({ error: 'Unauthorized override' });

  const { organizationId } = req.body;
  if (!organizationId) return res.status(400).json({ error: 'Target tenant ID required' });

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return res.status(404).json({ error: 'Tenant not found' });

  // 🔴 LOG IMPERSONATION
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'ADMIN_IMPERSONATION',
      actor: adminUser.id,
      target: organizationId,
      details: `DEV user ${adminUser.id} impersonated tenant ${organizationId}`,
      ipAddress: getClientMeta(req).ipAddress,
    }
  });

  const token = jwt.sign(
    { 
      id: `impersonated-${adminUser.id}`, 
      email: adminUser.email, 
      role: 'MD',
      organizationId: organizationId,
      isImpersonating: true,
      realAdminId: adminUser.id,
      impersonationTime: new Date().toISOString()
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return res.json({ token, user: { name: `Impersonating: ${organization.name}`, role: 'MD', organizationId, isImpersonating: true } });
};
```

---

#### 7. **Demo Mode Restrictions Are Incomplete**
**Location:** auth.middleware.ts:57-69

**Finding:**
```typescript
const allowedPaths = ['/api/audit/heartbeat', '/api/user/prefs'];
if (!allowedPaths.includes(req.path)) {
  return res.status(403).json({ error: 'Demo Mode: Modification restricted.' });
}
```

**Concern:**
- Whitelist approach is fragile (must list all allowed paths)
- GET requests are allowed, but query-string modifications aren't blocked
- Sidebar effect: Analytics, reports could leak demo data to real dashboards

**Recommendation:**
```typescript
// Blacklist approach is safer for demo mode
const DEMO_BLOCKED_OPERATIONS = [
  // User management
  /^\/api\/users\/(create|update|delete)/,
  // Payroll
  /^\/api\/payroll\/(create|update|delete)/,
  // Leave requests
  /^\/api\/leaves\/(create|update|delete)/,
  // Policy changes
  /^\/api\/policies\/(create|update|delete)/,
];

if (decoded.isDemo && isDestructive) {
  const isBlocked = DEMO_BLOCKED_OPERATIONS.some(pattern =>
    pattern.test(req.path)
  );
  
  if (isBlocked) {
    return res.status(403).json({
      error: 'This action is unavailable in demo mode.',
      isDemo: true
    });
  }
}
```

---

#### 8. **Missing Token Expiration Validation in Refresh Flow**
**Location:** auth.controller.ts:256-258

**Finding:**
```typescript
const found = await prisma.refreshToken.findUnique({ where: { tokenHash } });

if (!found || found.revokedAt || found.expiresAt < new Date()) {
  return res.status(401).json({ error: 'Invalid or expired refresh token' });
}
```

**Concern:**
- ✅ Expiration check is present (good)
- Database timestamp comparison depends on server time
- No protection if server clock is adjusted backwards

**Recommendation:**
```typescript
// Add clock skew tolerance (optional, for resilience)
const CLOCK_SKEW_TOLERANCE_MS = 5000; // 5 seconds

if (found.expiresAt.getTime() + CLOCK_SKEW_TOLERANCE_MS < Date.now()) {
  return res.status(401).json({ error: 'Invalid or expired refresh token' });
}

// Better: Log if time-travel detected
if (found.expiresAt > new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)) {
  console.warn('[Auth] Suspicious future expiration detected:', found.id);
}
```

---

### LOW PRIORITY

#### 9. **Weak Error Messages in Development**
**Location:** auth.controller.ts:156-160

**Finding:**
```typescript
} catch (error: any) {
  console.error('[Auth] Login CRITICAL error:', error.message, error.stack);
  return res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message  // ← Exposes internal error details
  });
}
```

**Concern:**
- `error.message` leaks implementation details
- Could reveal SQL errors, file paths, or sensitive data
- Only acceptable in development mode

**Recommendation:**
```typescript
} catch (error: any) {
  console.error('[Auth] Login error:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({ 
    error: 'Authentication service temporarily unavailable. Please try again.',
    ...(isDev && { debug: error.message })
  });
}
```

---

#### 10. **Client-Side Token Storage**
**Location:** client/src/pages/Login.tsx:47-51

**Finding:**
```typescript
storage.setItem(StorageKey.AUTH_TOKEN, token);
if (refreshToken) storage.setItem(StorageKey.REFRESH_TOKEN, refreshToken);
storage.setItem(StorageKey.USER, user || {});
```

**Concern:**
- Tokens stored in localStorage (accessible via XSS)
- No HttpOnly flag on stored cookies (if localStorage is used)
- User data stored alongside sensitive tokens

**Recommendation:**
```typescript
// BEST PRACTICE: Use HttpOnly cookies for tokens (server should set these)
// Client should:
// 1. Store only non-sensitive user data in localStorage
// 2. Keep tokens in memory for current session
// 3. Use refresh token endpoint on app start if needed

// Current approach is acceptable if:
// - XSS protection is strong (CSP, sanitization)
// - HTTPS is enforced
// - Tokens have short expiration (1 hour ✅)
// Consider migrating to HttpOnly cookies in future:

// Server-side (during login)
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true,       // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 60 * 60 * 1000, // 1 hour
  path: '/'
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/api/auth/refresh'
});
```

---

#### 11. **Password Reset Token Reuse Prevention**
**Location:** auth.controller.ts:479

**Finding:**
```typescript
if (resetRecord.usedAt) return res.status(400).json({ error: 'This reset link has already been used' });
```

**Concern:**
- ✅ Prevents token reuse (good)
- ❌ Doesn't log suspicious reuse attempt
- ❌ No rate limiting on failed reset attempts with same token

**Recommendation:**
```typescript
if (resetRecord.usedAt) {
  await safeLogSecurityEvent({
    email: resetRecord.user.email,
    success: false,
    organizationId: 'unknown',
    reason: 'PASSWORD_RESET_TOKEN_REUSE',
    req
  });
  return res.status(400).json({ 
    error: 'This reset link has already been used. Request a new one.' 
  });
}
```

---

## 🛡️ Recommended Security Checklist

- [ ] **URGENT:** Remove and rotate service account keys (sa_b64.txt)
- [ ] Fail-safe on missing organizationId (don't default to 'mcb-ghana-tenant')
- [ ] Add organization existence check to SSO login
- [ ] Add audit logging to impersonation endpoint
- [ ] Implement HttpOnly cookies for token storage
- [ ] Add error logging for password reset token reuse
- [ ] Review and update CSP headers in helmet config
- [ ] Implement CSRF token validation
- [ ] Add session binding (IP affinity check on token refresh)
- [ ] Implement account lockout after N failed login attempts (currently rate-limited only)

---

## 📊 Metrics & Monitoring

### Key Metrics to Track
```typescript
// Track in LoginSecurityEvent
- Failed login rate by email
- Failed login rate by IP
- Password reset frequency per user
- Token refresh patterns
- Sandwich attacks (multiple IPs same user)
- Session duration analytics
```

### Recommended Alerts
```
- 5+ failed logins from same IP in 1 hour
- Password reset requested 3x in 1 hour
- Login from new geographic region (if IP geolocation implemented)
- Access from IP matching previous failed attempt
- Terminated user account access attempts
```

---

## 🔄 Session Binding Recommendation

Add IP affinity for production (optional but recommended):

```typescript
// auth.middleware.ts
if (decoded.ipAddress && decoded.ipAddress !== getClientMeta(req).ipAddress) {
  console.warn(`[Auth] IP mismatch for user ${decoded.id}: ${decoded.ipAddress} → ${getClientMeta(req).ipAddress}`);
  
  if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({ 
      error: 'Session expired. Your IP changed. Please login again.' 
    });
  }
  // Dev/test allows IP changes
}
```

---

## 🚀 Production Deployment Checklist

- [ ] `JWT_SECRET` is cryptographically random (32+ bytes)
- [ ] `DATABASE_URL` uses SSL connection
- [ ] `FRONTEND_URL` matches exactly (no trailing slashes)
- [ ] Rate limits are tuned for expected load
- [ ] Email service credentials are rotated monthly
- [ ] Logs are aggregated and monitored (CloudWatch, Datadog, etc.)
- [ ] Alert thresholds are configured
- [ ] Backup credentials stored in secure vault (1Password, Vault, etc.)
- [ ] Incident response plan documents auth failures

---

## 📚 References

- **OWASP Top 10 2021:** A01:2021 – Broken Access Control
- **OWASP Session Management:** https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725
- **Bcrypt Reference:** https://www.npmjs.com/package/bcryptjs

---

## 🎯 Summary

**Overall Assessment:** ✅ **STRONG FOUNDATION** with minor improvements needed

The authentication system demonstrates:
- ✅ Strong password hashing (bcrypt-12)
- ✅ Proper rate limiting
- ✅ Secure token rotation
- ✅ Comprehensive audit logging
- ✅ Multi-method authentication (email, SSO, sandbox)

**Critical action:** Remove exposed service account keys from repository immediately.

**Recommended next steps:**
1. Fix critical issues (service account keys)
2. Implement HttpOnly cookie storage
3. Add organization existence validation to SSO
4. Audit logs for suspicious access patterns
