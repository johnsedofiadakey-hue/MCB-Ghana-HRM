"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wraps async route handlers to catch unhandled errors and return 500.
 * Prevents unhandled promise rejections from crashing the server.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
        console.error('[Unhandled]', err.message || err);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Internal server error' });
        }
    });
};
exports.asyncHandler = asyncHandler;
