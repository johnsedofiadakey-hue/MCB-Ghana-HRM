import { Request, Response, NextFunction } from 'express';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

/**
 * Global XSS Sanitizer Middleware
 * Recursively strips malicious HTML/scripts from request body, query, and params.
 */
export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query) as any;
  }
  if (req.params) {
    req.params = sanitize(req.params) as any;
  }
  next();
};

const sanitize = (data: any): any => {
  if (typeof data === 'string') {
    // Basic sanitization — allows NO records of HTML
    return DOMPurify.sanitize(data, {
        ALLOWED_TAGS: [], // No HTML allowed in standard text fields
        ALLOWED_ATTR: []
    }).trim();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  if (typeof data === 'object' && data !== null) {
    const clean: any = {};
    for (const key in data) {
      clean[key] = sanitize(data[key]);
    }
    return clean;
  }

  return data;
};
