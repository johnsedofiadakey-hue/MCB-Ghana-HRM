"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTenant = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const resolveTenant = async (req, res, next) => {
    try {
        // STANDALONE MODE: Everything is consolidated into the primary organization
        const DEFAULT_ORG_ID = 'mcb-ghana-tenant';
        req.organizationId = DEFAULT_ORG_ID;
        // Optional: Pre-fetch the organization object to avoid repeated lookups in controllers
        const organization = await client_1.default.organization.findUnique({
            where: { id: DEFAULT_ORG_ID },
            select: { id: true, name: true }
        });
        if (organization) {
            req.organization = organization;
        }
        next();
    }
    catch (error) {
        console.error('[TenantResolver] Error:', error);
        next();
    }
};
exports.resolveTenant = resolveTenant;
