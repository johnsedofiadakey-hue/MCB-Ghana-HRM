import api from '../services/api';

/**
 * Resolves a logo or image URL.
 * If the path starts with '/', it intelligently prefixes it with the backend's origin.
 */
export const getLogoUrl = (url?: string) => {
  if (!url) return null;
  
  // 🛡️ REFINERY: Fix malformed common typos like 'apidata:' (prevents 431 errors)
  let processedUrl = url.trim();
  if (processedUrl.startsWith('apidata:')) {
    processedUrl = processedUrl.replace('apidata:', 'data:');
  }

  // 🛡️ DATA-URI SHIELD: If it's already a valid URI, return it immediately
  if (processedUrl.startsWith('http') || processedUrl.startsWith('data:')) {
    return processedUrl;
  }

  // 🛡️ OVERFLOW PROTECTION (Tier 1): If the string is massive (> 500 chars) or contains base64 markers,
  // it's statistically certain to be a Data URI even if the prefix is missing or broken.
  if (processedUrl.length > 500 || processedUrl.includes(';base64,')) {
    // If it looks like a data URI but lacks the data: prefix, add it
    if (processedUrl.includes('image/') && !processedUrl.startsWith('data:')) {
       return `data:${processedUrl}`;
    }
    // If it's just a raw base64 string (often happens with some uploaders), assume image/png or similar
    if (!processedUrl.startsWith('data:') && !processedUrl.includes('http')) {
       // Only return as-is if it has the base64 marker, otherwise it might just be a long path (unlikely but safe)
       if (processedUrl.includes(';base64,')) return `data:${processedUrl}`;
    }
    return processedUrl;
  }

  // Helper to get the API base origin
  const getBaseOrigin = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl && apiUrl.startsWith('http')) {
      return new URL(apiUrl).origin;
    }
    const baseURL = api.defaults.baseURL || '';
    if (baseURL.startsWith('http')) {
      return new URL(baseURL).origin;
    }
    if (typeof window !== 'undefined' && window.location.port === '5173') {
      return 'http://localhost:5000';
    }
    return '';
  };

  const origin = getBaseOrigin();
  
  // 🛡️ DATA-URI SHIELD (Tier 2): Final check before concatenation to prevent 431 Header Errors
  // If the string contains base64 markers or is already successfully prefixed, stop here.
  if (processedUrl.startsWith('data:') || processedUrl.includes(';base64,') || processedUrl.startsWith('http')) {
     return processedUrl;
  }

  // Production Shield: If we are on Render and origin is missing/localhost,
  // we attempt to use the current window's origin but mapped to the standard backend port if needed
  if (!origin || origin.includes('localhost')) {
     if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
        return processedUrl.startsWith('/') ? processedUrl : `/${processedUrl}`;
     }
  }

  if (!origin) return processedUrl;

  const normalizedPath = processedUrl.startsWith('/') ? processedUrl : `/${processedUrl}`;
  return `${origin}${normalizedPath}`;
};
