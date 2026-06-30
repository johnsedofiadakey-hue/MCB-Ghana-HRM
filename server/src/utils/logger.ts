const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ctx: context,
    msg: message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };

  if (isDev) {
    const prefix = `[${entry.ts}] [${level.toUpperCase()}] [${context}]`;
    if (level === 'error') console.error(prefix, message, meta ?? '');
    else if (level === 'warn') console.warn(prefix, message, meta ?? '');
    else console.log(prefix, message, meta ?? '');
  } else {
    // Production: structured JSON for log aggregators (Render, Datadog, etc.)
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
  }
}

export const logger = {
  info: (ctx: string, msg: string, meta?: Record<string, unknown>) => log('info', ctx, msg, meta),
  warn: (ctx: string, msg: string, meta?: Record<string, unknown>) => log('warn', ctx, msg, meta),
  error: (ctx: string, msg: string, meta?: Record<string, unknown>) => log('error', ctx, msg, meta),
  debug: (ctx: string, msg: string, meta?: Record<string, unknown>) => {
    if (isDev) log('debug', ctx, msg, meta);
  },
};
