"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.prismaClient = void 0;
const client_1 = require("@prisma/client");
const context_1 = require("../utils/context");
exports.prismaClient = new client_1.PrismaClient();
/**
 * Extended Prisma Client for Multi-tenancy
 * Automatically injects organizationId into queries where applicable.
 */
exports.prisma = exports.prismaClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const organizationId = context_1.tenantContext.getStore()?.organizationId;
                // Isolation: Automatically add organizationId to where clauses
                const isIsolationOp = ['findFirst', 'findMany', 'findUnique', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation);
                if (organizationId && isIsolationOp && organizationId !== 'DEV_MASTER' && model !== 'Organization') {
                    // @ts-ignore
                    args.where = { ...args.where, organizationId };
                }
                // Auto-inject organizationId on create
                if (organizationId && (operation === 'create' || operation === 'createMany') && organizationId !== 'DEV_MASTER' && model !== 'Organization') {
                    // @ts-ignore
                    if (operation === 'create')
                        args.data = { ...args.data, organizationId };
                    // @ts-ignore
                    if (operation === 'createMany') {
                        if (Array.isArray(args.data)) {
                            args.data = args.data.map((d) => ({ ...d, organizationId }));
                        }
                        else {
                            args.data = { ...args.data, organizationId };
                        }
                    }
                }
                return query(args);
            }
        }
    }
});
exports.default = exports.prisma;
