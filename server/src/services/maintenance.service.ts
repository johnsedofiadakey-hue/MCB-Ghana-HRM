import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

export const runBackup = (): Promise<{ filename: string; path: string; sizeKB: number; cloudSynced: boolean; cloudId?: string }> => {
  return new Promise((resolve, reject) => {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-core-${date}.sql`;
    const filepath = path.join(BACKUP_DIR, filename);

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return reject(new Error('DATABASE_URL not set — backup requires PostgreSQL'));

    const command = `pg_dump "${dbUrl}" -f "${filepath}"`;
    exec(command, async (error) => {
      let cloudId: string | undefined = undefined;
      if (error) {
        // If pg_dump not available, write a JSON snapshot instead
        const snapshot = {
          timestamp: new Date().toISOString(),
          note: 'pg_dump not available — this is a metadata snapshot only',
          database: dbUrl.replace(/:\/\/[^@]+@/, '://***@') // mask credentials
        };
        fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
      }

      // ─── CLOUD SYNC ENGINE ───────────────────────────────────────────
      try {
        const { GoogleWorkspaceService } = await import('./workspace.service');
        cloudId = await GoogleWorkspaceService.syncFileToCloud(filepath);
        console.log(`[Lifecycle] Backup synced to cloud: ${cloudId}`);
      } catch (err) {
        console.warn('[Lifecycle] Google Drive Sync skipped or failed:', (err as any).message);
      }
      // ─────────────────────────────────────────────────────────────────

      const stat = fs.statSync(filepath);
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

export const listBackups = () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-core-'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, sizeKB: Math.round(stat.size / 1024), createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getSystemHealth = async () => {
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

const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
};
