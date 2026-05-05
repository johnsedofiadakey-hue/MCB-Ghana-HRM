"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoLogin = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../prisma/client"));
const roles_1 = require("../types/roles");
const JWT_SECRET = process.env.JWT_SECRET || 'nexus-secret-key';
const ACCESS_TOKEN_TTL = '2h'; // Demo sessions are short-lived
const getRoleRank = (role) => {
    if (!role)
        return 0;
    return roles_1.ROLE_RANK_MAP[role.toUpperCase()] ?? 0;
};
const getClientMeta = (req) => ({
    ipAddress: req.ip || req.socket.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
});
/**
 * ISSUES A SILENT DEMO HANDSHAKE
 * Allows marketing visitors to enter as specific roles without credentials.
 */
const demoLogin = async (req, res) => {
    try {
        const { role } = req.body;
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
        let user = await client_1.default.user.findUnique({
            where: { email: config.email }
        });
        if (!user) {
            // If the seeder hasn't run yet, we force a minimal identity to prevent blocking the visitor
            user = await client_1.default.user.create({
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
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            role: user.role,
            name: user.fullName,
            status: user.status,
            organizationId: DEMO_TENANT_ID,
            isDemo: true, // Critical: Triggers read-only / banner state in frontend
            demoExpiredAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hour lifespan
        }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
        // native simple refresh token for demo longevity within the 2 hour window
        const refreshToken = crypto_1.default.randomBytes(48).toString('hex');
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
    }
    catch (error) {
        console.error('[DemoLogin] Execution Fault:', error);
        return res.status(500).json({ error: 'The demonstration engine is currently undergoing maintenance. Please try again in a few minutes.' });
    }
};
exports.demoLogin = demoLogin;
