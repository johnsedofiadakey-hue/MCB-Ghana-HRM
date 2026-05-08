import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to catch unhandled errors and return 500.
 * Prevents unhandled promise rejections from crashing the server.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('[Unhandled]', err.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });
};
