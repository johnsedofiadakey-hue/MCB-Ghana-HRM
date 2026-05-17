import { storage, StorageKey } from '../services/storage';
import { ROLE_LABELS, ROLE_RANK_MAP } from '../types/roles';

export type SessionUser = {
  id?: string;
  role?: string;
  rank?: number;
  name?: string;
  email?: string;
  avatar?: string;
  jobTitle?: string;
  organizationId?: string;
  departmentId?: number;
  isImpersonating?: boolean;
};

export { ROLE_LABELS, ROLE_RANK_MAP as ROLE_RANKS };

export const getRoleRankValue = (role?: string): number => {
  if (!role) return 0;
  const normalized = role.toUpperCase().trim();
  const underscored = normalized.replace(/\s+/g, '_');
  const spaced = normalized.replace(/_/g, ' ');
  return ROLE_RANK_MAP[normalized] ?? ROLE_RANK_MAP[underscored] ?? ROLE_RANK_MAP[spaced] ?? 0;
};

export const getStoredUser = (): SessionUser => {
  const parsed = storage.getItem(StorageKey.USER, {} as any);
  if (!parsed || typeof parsed !== 'object') return {};
  const computedRank = getRoleRankValue(parsed.role);
  const storedRank = Number(parsed.rank);
  const rank = computedRank || (Number.isFinite(storedRank) ? storedRank : 0);
  return { ...parsed, rank } as SessionUser;
};

export const sanitizeSessionStorage = () => {
  const parsed = storage.getItem(StorageKey.USER, null);
  if (!parsed || typeof parsed !== 'object') {
    storage.removeItem(StorageKey.USER);
  }
};
