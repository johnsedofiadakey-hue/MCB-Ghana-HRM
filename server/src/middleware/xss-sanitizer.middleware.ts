import { Request, Response, NextFunction } from 'express';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as any);

// Routes where body fields may contain legitimate rich-text HTML (e.g. policy body, announcement content)
const RICH_TEXT_ROUTES = [
  '/policies',
  '/announcements',
];

// Fields within those routes that are allowed to carry HTML
const RICH_TEXT_FIELDS = new Set(['body', 'content', 'description', 'message']);

const ALLOWED_HTML_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'span', 'div',
];
const ALLOWED_HTML_ATTRS = ['href', 'target', 'rel', 'class', 'style'];

const isRichTextRoute = (path: string) =>
  RICH_TEXT_ROUTES.some(r => path.startsWith(`/api${r}`) || path.startsWith(r));

const sanitizeStrict = (value: string): string =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

const sanitizeRichText = (value: string): string =>
  DOMPurify.sanitize(value, { ALLOWED_TAGS: ALLOWED_HTML_TAGS, ALLOWED_ATTR: ALLOWED_HTML_ATTRS }).trim();

const sanitize = (data: any, allowRich = false): any => {
  if (typeof data === 'string') {
    return allowRich ? sanitizeRichText(data) : sanitizeStrict(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item, allowRich));
  }
  if (typeof data === 'object' && data !== null) {
    const clean: any = {};
    for (const key in data) {
      const fieldAllowsRich = allowRich && RICH_TEXT_FIELDS.has(key);
      clean[key] = sanitize(data[key], fieldAllowsRich);
    }
    return clean;
  }
  return data;
};

export const xssSanitizer = (req: Request, res: Response, next: NextFunction) => {
  const richTextRoute = isRichTextRoute(req.path);

  if (req.body) {
    req.body = richTextRoute
      ? sanitize(req.body, true)   // field-level allowlist for rich-text routes
      : sanitize(req.body, false);
  }
  if (req.query) {
    req.query = sanitize(req.query, false) as any;
  }
  if (req.params) {
    req.params = sanitize(req.params, false) as any;
  }

  next();
};
