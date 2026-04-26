import axios from 'axios';
import { storage, StorageKey } from './storage';
import type { User } from '../types/models';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://mcb-ghana-hrm-api.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

interface SessionPayload {
  token: string;
  refreshToken?: string;
  user?: User;
}

const storeSession = (payload: SessionPayload) => {
  storage.setItem(StorageKey.AUTH_TOKEN, payload.token);
  if (payload.refreshToken) storage.setItem(StorageKey.REFRESH_TOKEN, payload.refreshToken);
  if (payload.user) storage.setItem(StorageKey.USER, payload.user);
};

const clearSession = () => {
  storage.clearSession();
};

const flushRefreshQueue = (token: string | null) => {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
};

// --- PROACTIVE AUTH HELPERS ---
const getIsTokenStale = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const buffer = 300; // 5 minute proactive buffer
    return payload.exp - now < buffer;
  } catch {
    return true;
  }
};

const performSilentRefresh = async (): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push((token) => resolve(token));
    });
  }

  const refreshToken = storage.getItem(StorageKey.REFRESH_TOKEN, null);
  if (!refreshToken) return null;

  isRefreshing = true;
  try {
    console.log('[API Interceptor] Proactively refreshing stale session...');
    const refreshUrl = `${api.defaults.baseURL}/auth/refresh`;
    const { data } = await axios.post<SessionPayload>(refreshUrl, { refreshToken });
    
    storeSession(data);
    flushRefreshQueue(data.token);
    return data.token;
  } catch (err) {
    console.error('[API Interceptor] Proactive refresh FAILED:', err);
    flushRefreshQueue(null);
    clearSession();
    return null;
  } finally {
    isRefreshing = false;
  }
};

api.interceptors.request.use(
  async (config) => {
    let token = storage.getItem(StorageKey.AUTH_TOKEN, null);
    
    // 1. Skip logic for refresh route
    if (config.url?.includes('/auth/refresh')) {
      if (token) {
        delete config.headers['Authorization'];
      }
      return config;
    }

    // 2. PROACTIVE REFRESH GUARD
    // If token exists and is about to expire, refresh it BEFORE making the request
    if (token && getIsTokenStale(token)) {
       const newToken = await performSilentRefresh();
       if (newToken) token = newToken;
    }

    if (token) {
      config.headers = config.headers || {};
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    }

    // DEV CONSOLE: Use server-issued dev JWT for /dev/ routes
    const devToken = storage.getItem(StorageKey.DEV_TOKEN, null);
    if (devToken && config.url?.includes('/dev')) {
      config.headers = config.headers || {};
      (config.headers as any)['Authorization'] = `Bearer ${devToken}`;
    }

    // FIREBASE DEV MODE: Inject Google ID Token as fallback
    const devMode = storage.getItem(StorageKey.DEV_MODE, 'false') === 'true';
    if (devMode) {
      const fbToken = storage.getItem(StorageKey.DEV_FIREBASE_TOKEN, null);
      if (fbToken) {
        config.headers = config.headers || {};
        (config.headers as any)['X-Dev-Firebase-Token'] = fbToken;
      }
    }

    // Always inject the current domain so the backend can dynamically resolve the tenant
    config.headers = config.headers || {};
    (config.headers as any)['X-Tenant-Domain'] = window.location.hostname;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean });

    if (error.response?.status === 401 && !originalRequest?._retry && !originalRequest.url?.includes('/auth/refresh')) {
      const refreshToken = storage.getItem(StorageKey.REFRESH_TOKEN, null);
      
      console.warn(`[API Interceptor] 401 detected for: ${originalRequest.url}. Attempting refresh...`);

      if (!refreshToken) {
        console.error('[API Interceptor] No refresh token found. Redirecting to login.');
        clearSession();
      if (window.location.pathname !== '/') {
          // Safeguard: Don't redirect to root if we are in the Shadow Zone (Central Portal)
          const isShadowZone = window.location.pathname === '/' || window.location.pathname.includes('/dev-portal') || window.location.pathname.includes('/nexus-master-console');
          const hasDevSession = !!storage.getItem(StorageKey.DEV_TOKEN, null) || (!!storage.getItem(StorageKey.DEV_FIREBASE_TOKEN, null) && storage.getItem(StorageKey.DEV_MODE, 'false') === 'true');
          
          if (isShadowZone || hasDevSession) {
              console.warn('[API Interceptor] Error in Central Zone - Suppressing root redirect to preserve admin context.');
          } else {
              window.location.href = '/';
          }
      }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        console.log('[API Interceptor] Already refreshing. Queuing request:', originalRequest.url);
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers || {};
            (originalRequest.headers as any)['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('[API Interceptor] Calling /auth/refresh...');
        const refreshUrl = `${api.defaults.baseURL}/auth/refresh`;
        const { data } = await axios.post<SessionPayload>(refreshUrl, { refreshToken });
        
        console.log('[API Interceptor] Refresh successful. New access token acquired.');
        storeSession(data);
        flushRefreshQueue(data.token);
        
        originalRequest.headers = originalRequest.headers || {};
        (originalRequest.headers as any)['Authorization'] = `Bearer ${data.token}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        const errorData = refreshError.response?.data;
        console.error('[API Interceptor] Refresh FAILED:', {
          status: refreshError.response?.status,
          error: errorData?.error || errorData || refreshError.message
        });
        
        flushRefreshQueue(null);
        clearSession();
        
        if (window.location.pathname !== '/') {
           console.warn('[API Interceptor] Redirecting to login due to refresh failure.');
           window.location.href = '/';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status === 402) {
      console.warn('[API Interceptor] 402 Payment Required for:', originalRequest.url);
      if (window.location.pathname !== '/billing-lock') {
          window.location.href = '/billing-lock';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
