import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  organizationId: string | null;
  userId: string | null;
  role: string | null;
}

export const tenantContext = new AsyncLocalStorage<TenantContext>();

export const getTenantId = (): string | null => {
  return tenantContext.getStore()?.organizationId || null;
};

export const getUserId = (): string | null => {
  return tenantContext.getStore()?.userId || null;
};
