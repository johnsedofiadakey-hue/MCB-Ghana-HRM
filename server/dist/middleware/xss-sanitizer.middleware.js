"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssSanitizer = void 0;
const dompurify_1 = __importDefault(require("dompurify"));
const jsdom_1 = require("jsdom");
const window = new jsdom_1.JSDOM('').window;
const DOMPurify = (0, dompurify_1.default)(window);
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
const isRichTextRoute = (path) => RICH_TEXT_ROUTES.some(r => path.startsWith(`/api${r}`) || path.startsWith(r));
const sanitizeStrict = (value) => DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
const sanitizeRichText = (value) => DOMPurify.sanitize(value, { ALLOWED_TAGS: ALLOWED_HTML_TAGS, ALLOWED_ATTR: ALLOWED_HTML_ATTRS }).trim();
const sanitize = (data, allowRich = false) => {
    if (typeof data === 'string') {
        return allowRich ? sanitizeRichText(data) : sanitizeStrict(data);
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitize(item, allowRich));
    }
    if (typeof data === 'object' && data !== null) {
        const clean = {};
        for (const key in data) {
            const fieldAllowsRich = allowRich && RICH_TEXT_FIELDS.has(key);
            clean[key] = sanitize(data[key], fieldAllowsRich);
        }
        return clean;
    }
    return data;
};
const xssSanitizer = (req, res, next) => {
    const richTextRoute = isRichTextRoute(req.path);
    if (req.body) {
        req.body = richTextRoute
            ? sanitize(req.body, true) // field-level allowlist for rich-text routes
            : sanitize(req.body, false);
    }
    if (req.query) {
        req.query = sanitize(req.query, false);
    }
    if (req.params) {
        req.params = sanitize(req.params, false);
    }
    next();
};
exports.xssSanitizer = xssSanitizer;
