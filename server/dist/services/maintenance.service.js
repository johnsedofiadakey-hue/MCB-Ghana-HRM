"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemHealth = exports.listBackups = exports.runBackup = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const BACKUP_DIR = path_1.default.join(process.cwd(), 'storage', 'backups');
if (!fs_1.default.existsSync(BACKUP_DIR))
    fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
const runBackup = () => {
    return new Promise((resolve, reject) => {
        const date = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-core-${date}.sql`;
        const filepath = path_1.default.join(BACKUP_DIR, filename);
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl)
            return reject(new Error('DATABASE_URL not set — backup requires PostgreSQL'));
        const command = `pg_dump "${dbUrl}" -f "${filepath}"`;
        (0, child_process_1.exec)(command, async (error) => {
            let cloudId = undefined;
            if (error) {
                // If pg_dump not available, write a JSON snapshot instead
                const snapshot = {
                    timestamp: new Date().toISOString(),
                    note: 'pg_dump not available — this is a metadata snapshot only',
                    database: dbUrl.replace(/:\/\/[^@]+@/, '://***@') // mask credentials
                };
                fs_1.default.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
            }
            // ─── CLOUD SYNC ENGINE ───────────────────────────────────────────
            try {
                const { GoogleWorkspaceService } = await Promise.resolve().then(() => __importStar(require('./workspace.service')));
                cloudId = await GoogleWorkspaceService.syncFileToCloud(filepath);
                console.log(`[Lifecycle] Backup synced to cloud: ${cloudId}`);
            }
            catch (err) {
                console.warn('[Lifecycle] Google Drive Sync skipped or failed:', err.message);
            }
            // ─────────────────────────────────────────────────────────────────
            const stat = fs_1.default.statSync(filepath);
            resolve({
                filename,
                path: `/backups/${filename}`,
                sizeKB: Math.round(stat.size / 1024),
                cloudSynced: !!cloudId,
                cloudId
            });
        });
    });
};
exports.runBackup = runBackup;
const listBackups = () => {
    if (!fs_1.default.existsSync(BACKUP_DIR))
        return [];
    return fs_1.default.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup-core-'))
        .map(f => {
        const stat = fs_1.default.statSync(path_1.default.join(BACKUP_DIR, f));
        return { filename: f, sizeKB: Math.round(stat.size / 1024), createdAt: stat.mtime.toISOString() };
    })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};
exports.listBackups = listBackups;
const getSystemHealth = async () => {
    const mem = process.memoryUsage();
    return {
        status: 'HEALTHY',
        uptime: Math.floor(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        memory: {
            heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
            rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
        },
        pid: process.pid,
        version: process.version
    };
};
exports.getSystemHealth = getSystemHealth;
const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
};
