"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const isDev = process.env.NODE_ENV !== 'production';
function log(level, context, message, meta) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        ctx: context,
        msg: message,
        ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    };
    if (isDev) {
        const prefix = `[${entry.ts}] [${level.toUpperCase()}] [${context}]`;
        if (level === 'error')
            console.error(prefix, message, meta ?? '');
        else if (level === 'warn')
            console.warn(prefix, message, meta ?? '');
        else
            console.log(prefix, message, meta ?? '');
    }
    else {
        // Production: structured JSON for log aggregators (Render, Datadog, etc.)
        console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
    }
}
exports.logger = {
    info: (ctx, msg, meta) => log('info', ctx, msg, meta),
    warn: (ctx, msg, meta) => log('warn', ctx, msg, meta),
    error: (ctx, msg, meta) => log('error', ctx, msg, meta),
    debug: (ctx, msg, meta) => {
        if (isDev)
            log('debug', ctx, msg, meta);
    },
};
