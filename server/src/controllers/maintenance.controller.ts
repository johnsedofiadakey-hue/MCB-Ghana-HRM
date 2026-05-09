import { Request, Response } from 'express';
import * as maintenanceService from '../services/maintenance.service';

export const triggerBackup = async (req: Request, res: Response) => {
    try {
        const result = await maintenanceService.runBackup();
        res.json({ message: "Backup completed successfully", result });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Backup failed", error: error.message });
    }
};

export const checkHealth = async (req: Request, res: Response) => {
    try {
        const health = await maintenanceService.getSystemHealth();
        res.json(health);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBackups = async (req: Request, res: Response) => {
    try {
        const backups = maintenanceService.listBackups();
        res.json(backups);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const downloadBackup = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;
        const fs = await import('fs');
        const path = await import('path');
        const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');
        // 🛡️ SECURITY FIX: Sanitize filename to prevent path traversal
        const safeFilename = path.basename(filename);
        const filepath = path.join(BACKUP_DIR, safeFilename);

        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: "Backup file not found" });
        }

        res.download(filepath);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
