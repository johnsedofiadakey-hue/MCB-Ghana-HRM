import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage, StorageKey } from '../services/storage';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should store and retrieve a string value correctly', () => {
    storage.setItem(StorageKey.AUTH_TOKEN, 'test-token');
    expect(storage.getItem(StorageKey.AUTH_TOKEN, '')).toBe('test-token');
    expect(localStorage.getItem(StorageKey.AUTH_TOKEN)).toBe('test-token');
  });

  it('should store and retrieve an object value correctly', () => {
    const user = { id: '1', name: 'John Doe' };
    storage.setItem(StorageKey.USER, user);
    expect(storage.getItem(StorageKey.USER, null)).toEqual(user);
    expect(localStorage.getItem(StorageKey.USER)).toBe(JSON.stringify(user));
  });

  it('should return default value on parse error', () => {
    localStorage.setItem(StorageKey.USER, 'invalid-json');
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const result = storage.getItem(StorageKey.USER, { id: 'default' });
    
    expect(result).toEqual({ id: 'default' });
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should clear session keys correctly', () => {
    storage.setItem(StorageKey.AUTH_TOKEN, 'token');
    storage.setItem(StorageKey.USER, { id: '1' });
    storage.setItem(StorageKey.SIDEBAR_COLLAPSED, 'true'); // Should not be cleared

    storage.clearSession();

    expect(storage.getItem(StorageKey.AUTH_TOKEN, null)).toBeNull();
    expect(storage.getItem(StorageKey.USER, null)).toBeNull();
    expect(storage.getItem(StorageKey.SIDEBAR_COLLAPSED, 'false')).toBe('true');
  });
});
