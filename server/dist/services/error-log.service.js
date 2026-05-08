"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorLogger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ErrorLogger {
    constructor() {
        this.lastErrors = [];
        this.MAX_ERRORS = 50;
        this.LOG_DIR = path_1.default.join(process.cwd(), 'storage', 'logs');
        this.LOG_FILE = path_1.default.join(this.LOG_DIR, 'error.log');
        if (!fs_1.default.existsSync(this.LOG_DIR)) {
            fs_1.default.mkdirSync(this.LOG_DIR, { recursive: true });
        }
    }
    log(ctx, err) {
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
            fs_1.default.appendFileSync(this.LOG_FILE, logLine);
            // Basic rotation: if file > 5MB, rename it and start new
            const stats = fs_1.default.statSync(this.LOG_FILE);
            if (stats.size > 5 * 1024 * 1024) {
                fs_1.default.renameSync(this.LOG_FILE, path_1.default.join(this.LOG_DIR, `error-${Date.now()}.log`));
            }
        }
        catch (writeErr) {
            console.error('[ErrorLogger] Failed to write to log file:', writeErr);
        }
        console.error(`[${ctx}]`, err);
    }
    getErrors() {
        return this.lastErrors;
    }
}
exports.errorLogger = new ErrorLogger();
