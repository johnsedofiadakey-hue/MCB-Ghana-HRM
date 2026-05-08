import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../utils/context';

export const prismaClient = new PrismaClient();

/**
 * Extended Prisma Client for Multi-tenancy
 * Automatically injects organizationId into queries where applicable.
 */
export const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const organizationId = tenantContext.getStore()?.organizationId;

        // Isolation: Automatically add organizationId to where clauses
        const isIsolationOp = ['findFirst', 'findMany', 'findUnique', 'update', 'updateMany', 'delete', 'deleteMany', 'count'].includes(operation);
        
        if (organizationId && isIsolationOp && organizationId !== 'DEV_MASTER' && model !== 'Organization') {
          // @ts-ignore
          args.where = { ...args.where, organizationId };
        }

        // Auto-inject organizationId on create
        if (organizationId && (operation === 'create' || operation === 'createMany') && organizationId !== 'DEV_MASTER' && model !== 'Organization') {

          // @ts-ignore
          if (operation === 'create') args.data = { ...args.data, organizationId };
          // @ts-ignore
          if (operation === 'createMany') {
             if (Array.isArray(args.data)) {
               args.data = args.data.map((d: any) => ({ ...d, organizationId }));
             } else {
               args.data = { ...args.data, organizationId };
             }
          }
        }

        return query(args);
      }
    }
  }
});

export default prisma;
export type ExtendedPrismaClient = typeof prisma;
