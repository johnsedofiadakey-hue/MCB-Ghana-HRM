import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { loginLimiter, passwordResetLimiter } from '../middleware/rate-limit.middleware';
import { validate, LoginSchema, ChangePasswordSchema, ForgotPasswordSchema, ResetPasswordSchema, TenantSignupSchema } from '../middleware/validate.middleware';
import * as authController from '../controllers/auth.controller';
import * as demoController from '../controllers/demo.controller';

const router = Router();

router.post('/login', loginLimiter, validate(LoginSchema), authController.login);
router.post('/sso', loginLimiter, authController.ssoLogin);
router.post('/signup', validate(TenantSignupSchema), authController.signup);
router.post('/refresh', authController.refreshAccessToken);
router.post('/logout', authenticate, authController.revokeRefreshToken);
router.post('/forgot-password', passwordResetLimiter, validate(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(ResetPasswordSchema), authController.resetPassword);

router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validate(ChangePasswordSchema), authController.changePassword);
router.post('/impersonate', authenticate, authController.impersonateTenant);

router.post('/sandbox', authController.sandboxLogin);
router.post('/demo-login', loginLimiter, demoController.demoLogin);

export default router;
