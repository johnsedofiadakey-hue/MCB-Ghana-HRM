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
exports.BackupService = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const admin = __importStar(require("firebase-admin"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class BackupService {
    static initFirebase() {
        if (this.isFirebaseInitialized)
            return true;
        try {
            const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
                ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
                : null;
            if (serviceAccount) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                this.isFirebaseInitialized = true;
                console.log('✅ Firebase Admin initialized for backups');
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Failed to initialize Firebase Admin:', error);
            return false;
        }
    }
    static async runFullBackup() {
        const timestamp = new Date().toISOString();
        const backupData = {
            timestamp,
            version: '2.0.1',
            data: {}
        };
        try {
            console.log(`[BackupService] Starting full backup at ${timestamp}`);
            // Fetch critical tables
            const [orgs, users, subscriptions, payrolls] = await Promise.all([
                client_1.default.organization.findMany(),
                client_1.default.user.findMany({ select: { id: true, email: true, fullName: true, role: true, organizationId: true, status: true } }),
                client_1.default.subscription.findMany(),
                client_1.default.payrollRun.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
            ]);
            backupData.data = {
                organizations: orgs,
                users: users,
                subscriptions: subscriptions,
                payrolls: payrolls
            };
            // 1. Local Backup (Safe Fallback)
            const backupDir = path_1.default.join(process.cwd(), 'backups');
            if (!fs_1.default.existsSync(backupDir))
                fs_1.default.mkdirSync(backupDir);
            const fileName = `backup-${new Date().getTime()}.json`;
            fs_1.default.writeFileSync(path_1.default.join(backupDir, fileName), JSON.stringify(backupData, null, 2));
            console.log(`✅ Local backup saved to backups/${fileName}`);
            // 2. Firebase Redundancy
            if (this.initFirebase()) {
                const db = admin.firestore();
                await db.collection('system_backups').doc(timestamp.replace(/\./g, '_')).set(backupData);
                console.log('✅ Backup pushed to Firebase Firestore');
            }
            else {
                console.warn('⚠️ Firebase backup skipped: No service account provided.');
            }
            return { success: true, localFile: fileName, firebaseSynced: this.isFirebaseInitialized };
        }
        catch (error) {
            console.error('❌ Backup failed:', error);
            throw error;
        }
    }
}
exports.BackupService = BackupService;
BackupService.isFirebaseInitialized = false;
