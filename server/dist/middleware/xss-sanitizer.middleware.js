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
/**
 * Global XSS Sanitizer Middleware
 * Recursively strips malicious HTML/scripts from request body, query, and params.
 */
const xssSanitizer = (req, res, next) => {
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    if (req.params) {
        req.params = sanitize(req.params);
    }
    next();
};
exports.xssSanitizer = xssSanitizer;
const sanitize = (data) => {
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
        const clean = {};
        for (const key in data) {
            clean[key] = sanitize(data[key]);
        }
        return clean;
    }
    return data;
};
