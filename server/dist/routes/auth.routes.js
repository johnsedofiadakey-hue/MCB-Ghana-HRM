"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const authController = __importStar(require("../controllers/auth.controller"));
const demoController = __importStar(require("../controllers/demo.controller"));
const router = (0, express_1.Router)();
router.post('/login', rate_limit_middleware_1.loginLimiter, (0, validate_middleware_1.validate)(validate_middleware_1.LoginSchema), authController.login);
router.post('/sso', rate_limit_middleware_1.loginLimiter, authController.ssoLogin);
router.post('/signup', (0, validate_middleware_1.validate)(validate_middleware_1.TenantSignupSchema), authController.signup);
router.post('/refresh', authController.refreshAccessToken);
router.post('/logout', auth_middleware_1.authenticate, authController.revokeRefreshToken);
router.post('/forgot-password', rate_limit_middleware_1.passwordResetLimiter, (0, validate_middleware_1.validate)(validate_middleware_1.ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', rate_limit_middleware_1.passwordResetLimiter, (0, validate_middleware_1.validate)(validate_middleware_1.ResetPasswordSchema), authController.resetPassword);
router.get('/me', auth_middleware_1.authenticate, authController.getMe);
router.post('/change-password', auth_middleware_1.authenticate, (0, validate_middleware_1.validate)(validate_middleware_1.ChangePasswordSchema), authController.changePassword);
router.post('/impersonate', auth_middleware_1.authenticate, authController.impersonateTenant);
router.post('/sandbox', authController.sandboxLogin);
router.post('/demo-login', rate_limit_middleware_1.loginLimiter, demoController.demoLogin);
exports.default = router;
