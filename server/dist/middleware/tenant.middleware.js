"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenant = void 0;
const client_1 = __importDefault(require("../prisma/client"));
// 🛡️ PERFORMANCE FIX: Simple in-memory cache for the primary tenant
let cachedOrganization = null;
const CACHE_TTL = 300000; // 5 minutes
let lastCacheUpdate = 0;
const resolveTenant = async (req, res, next) => {
    try {
        const DEFAULT_ORG_ID = 'mcb-ghana-tenant';
        const now = Date.now();
        req.organizationId = DEFAULT_ORG_ID;
        // Check cache first
        if (!cachedOrganization || (now - lastCacheUpdate) > CACHE_TTL) {
            const organization = await client_1.default.organization.findUnique({
                where: { id: DEFAULT_ORG_ID },
                select: { id: true, name: true }
            });
            if (organization) {
                cachedOrganization = organization;
                lastCacheUpdate = now;
            }
        }
        if (cachedOrganization) {
            req.organization = cachedOrganization;
        }
        next();
    }
    catch (error) {
        console.error('[TenantResolver] Error:', error);
        next();
    }
};
exports.resolveTenant = resolveTenant;
