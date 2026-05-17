import api from '../services/api';

export const getApiUrl = (path: string) => {
  const baseURL = String(api.defaults.baseURL || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseURL}${normalizedPath}`;
};

export const openApiUrl = (path: string) => {
  window.open(getApiUrl(path), '_blank');
};
