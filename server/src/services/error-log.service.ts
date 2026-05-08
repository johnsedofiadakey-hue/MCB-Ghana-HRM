import fs from 'fs';
import path from 'path';

class ErrorLogger {
  private lastErrors: any[] = [];
  private readonly MAX_ERRORS = 50;
  private readonly LOG_DIR = path.join(process.cwd(), 'storage', 'logs');
  private readonly LOG_FILE = path.join(this.LOG_DIR, 'error.log');

  constructor() {
    if (!fs.existsSync(this.LOG_DIR)) {
      fs.mkdirSync(this.LOG_DIR, { recursive: true });
    }
  }

  log(ctx: string, err: any) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      context: ctx,
      message: err.message || err,
      stack: err.stack,
      data: err.response?.data || err.data
    };

    // Keep in-memory for quick debug dashboard
    this.lastErrors.unshift(errorEntry);
    if (this.lastErrors.length > this.MAX_ERRORS) {
      this.lastErrors.pop();
    }

    // Persist to disk
    const logLine = `[${errorEntry.timestamp}] [${ctx}] ${errorEntry.message}\n${errorEntry.stack || ''}\n${errorEntry.data ? JSON.stringify(errorEntry.data) : ''}\n${'-'.repeat(50)}\n`;
    
    try {
      fs.appendFileSync(this.LOG_FILE, logLine);
      
      // Basic rotation: if file > 5MB, rename it and start new
      const stats = fs.statSync(this.LOG_FILE);
      if (stats.size > 5 * 1024 * 1024) {
        fs.renameSync(this.LOG_FILE, path.join(this.LOG_DIR, `error-${Date.now()}.log`));
      }
    } catch (writeErr) {
      console.error('[ErrorLogger] Failed to write to log file:', writeErr);
    }

    console.error(`[${ctx}]`, err);
  }

  getErrors() {
    return this.lastErrors;
  }
}

export const errorLogger = new ErrorLogger();
