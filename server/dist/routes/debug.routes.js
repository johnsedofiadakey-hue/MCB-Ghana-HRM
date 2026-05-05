"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = __importDefault(require("../prisma/client"));
const router = (0, express_1.Router)();
router.get('/env', async (req, res) => {
    try {
        const userCount = await client_1.default.user.count();
        const settings = await client_1.default.systemSettings.findFirst();
        res.json({
            timestamp: new Date().toISOString(),
            nodeEnv: process.env.NODE_ENV,
            version: '2.2.0',
            databaseType: 'postgresql',
            userCount,
            maintenance: settings,
            headers: req.headers,
        });
    }
    catch (err) {
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
const auth_middleware_1 = require("../middleware/auth.middleware");
router.get('/whoami', auth_middleware_1.authenticate, (req, res) => {
    res.json({
        user: req.user,
        authHeader: req.headers.authorization ? 'Present' : 'Missing',
        path: req.path
    });
});
router.get('/users', async (req, res) => {
    try {
        const users = await client_1.default.user.findMany({
            select: { id: true, role: true, organizationId: true, fullName: true }
        });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const auth_middleware_2 = require("../middleware/auth.middleware");
router.get('/inspect-user/:id', async (req, res) => {
    try {
        const user = await client_1.default.user.findUnique({
            where: { id: req.params.id },
            select: { id: true, role: true, status: true, fullName: true, organizationId: true, leaveBalance: true, leaveAllowance: true },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const rank = (0, auth_middleware_2.getRoleRank)(user.role);
        res.json({
            ...user,
            rank,
            isOrgMissing: !user.organizationId && user.role !== 'DEV'
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const error_log_service_1 = require("../services/error-log.service");
router.get('/errors', (req, res) => {
    res.json(error_log_service_1.errorLogger.getErrors());
});
exports.default = router;
