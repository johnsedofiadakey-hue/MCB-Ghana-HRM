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
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadBackup = exports.getBackups = exports.checkHealth = exports.triggerBackup = void 0;
const maintenanceService = __importStar(require("../services/maintenance.service"));
const triggerBackup = async (req, res) => {
    try {
        const result = await maintenanceService.runBackup();
        res.json({ message: "Backup completed successfully", result });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Backup failed", error: error.message });
    }
};
exports.triggerBackup = triggerBackup;
const checkHealth = async (req, res) => {
    try {
        const health = await maintenanceService.getSystemHealth();
        res.json(health);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.checkHealth = checkHealth;
const getBackups = async (req, res) => {
    try {
        const backups = maintenanceService.listBackups();
        res.json(backups);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getBackups = getBackups;
const downloadBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const BACKUP_DIR = path.join(process.cwd(), 'storage', 'backups');
        const filepath = path.join(BACKUP_DIR, filename);
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ message: "Backup file not found" });
        }
        res.download(filepath);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.downloadBackup = downloadBackup;
