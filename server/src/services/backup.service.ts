import prisma from '../prisma/client';
import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

export class BackupService {
  private static isFirebaseInitialized = false;

  private static initFirebase() {
    if (this.isFirebaseInitialized) return true;

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
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin:', error);
      return false;
    }
  }

  static async runFullBackup() {
    const timestamp = new Date().toISOString();
    const backupData: any = {
      timestamp,
      version: '2.0.1',
      data: {}
    };

    try {
      console.log(`[BackupService] Starting full backup at ${timestamp}`);

      // Fetch critical tables
      const [orgs, users, subscriptions, payrolls] = await Promise.all([
        prisma.organization.findMany(),
        prisma.user.findMany({ select: { id: true, email: true, fullName: true, role: true, organizationId: true, status: true } }),
        prisma.subscription.findMany(),
        prisma.payrollRun.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
      ]);

      backupData.data = {
        organizations: orgs,
        users: users,
        subscriptions: subscriptions,
        payrolls: payrolls
      };

      // 1. Local Backup (Safe Fallback)
      const backupDir = path.join(process.cwd(), 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
      
      const fileName = `backup-${new Date().getTime()}.json`;
      fs.writeFileSync(path.join(backupDir, fileName), JSON.stringify(backupData, null, 2));
      console.log(`✅ Local backup saved to backups/${fileName}`);

      // 2. Firebase Redundancy
      if (this.initFirebase()) {
        const db = admin.firestore();
        await db.collection('system_backups').doc(timestamp.replace(/\./g, '_')).set(backupData);
        console.log('✅ Backup pushed to Firebase Firestore');
      } else {
        console.warn('⚠️ Firebase backup skipped: No service account provided.');
      }

      return { success: true, localFile: fileName, firebaseSynced: this.isFirebaseInitialized };
    } catch (error: any) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }
}
