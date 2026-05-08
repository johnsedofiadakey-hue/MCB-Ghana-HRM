import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import prisma from '../prisma/client';

/**
 * Google Workspace Service (Enterprise Version)
 * MCB-HRM Ghana — Unified Cloud Archival & Autonomous Scheduling
 */

export class GoogleWorkspaceService {
  private static driveClient: any = null;
  private static calendarClient: any = null;
  private static KEY_PATH = path.join(process.cwd(), 'google-drive-key.json');

  private static async getAuth() {
    let auth;
    if (process.env.GOOGLE_DRIVE_KEY_JSON) {
      auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_DRIVE_KEY_JSON),
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/calendar.events'
        ],
      });
    } else {
      if (!fs.existsSync(this.KEY_PATH)) throw new Error('Google Workspace credentials missing');
      auth = new google.auth.GoogleAuth({
        keyFile: this.KEY_PATH,
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/calendar.events'
        ],
      });
    }
    return auth;
  }

  private static async getDriveClient() {
    if (this.driveClient) return this.driveClient;
    const auth = await this.getAuth();
    const authClient = await auth.getClient();
    this.driveClient = google.drive({ version: 'v3', auth: authClient as any });
    return this.driveClient;
  }

  private static async getCalendarClient() {
    if (this.calendarClient) return this.calendarClient;
    const auth = await this.getAuth();
    const authClient = await auth.getClient();
    this.calendarClient = google.calendar({ version: 'v3', auth: authClient as any });
    return this.calendarClient;
  }

  // --- DRIVE METHODS (Archival & Sync) ---

  static async uploadToDrive(localPath: string, folderName = 'MCB-HR-Platform-Cloud-Vault') {
    return this.syncFileToCloud(localPath, folderName);
  }

  static async syncFileToCloud(localPath: string, folderName = 'MCB-HR-Platform-Cloud-Vault') {
    try {
      const drive = await this.getDriveClient();
      const folderId = await this.getOrCreateFolder(folderName);
      const filename = path.basename(localPath);

      const fileMetadata = { name: filename, parents: [folderId] };
      const media = { body: fs.createReadStream(localPath) };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id',
      });

      console.log(`[GoogleWorkspace] Sync Complete: ${filename} -> ${response.data.id}`);
      await this.pruneOldBackups(folderId); // Maintenance logic
      return response.data.id;
    } catch (error: any) {
      console.error('[GoogleWorkspace] Sync Failed:', error.message);
      throw error;
    }
  }

  static async getOrCreateFolder(name: string): Promise<string> {
    const drive = await this.getDriveClient();
    const listRes = await drive.files.list({
      q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    const existing = listRes.data.files?.[0];
    if (existing?.id) return existing.id;

    const folder = await drive.files.create({
      resource: { name, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id',
    });

    return folder.data.id;
  }

  private static async pruneOldBackups(folderId: string) {
    try {
      const drive = await this.getDriveClient();
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc',
      });
      const files = res.data.files || [];
      if (files.length > 30) {
        const toDelete = files.slice(30);
        for (const file of toDelete) {
          await drive.files.delete({ fileId: file.id });
        }
      }
    } catch (e: any) { console.warn('[GoogleWorkspace] Pruning Warning:', e.message); }
  }

  static async shareFolderWithUser(email: string, folderName = 'MCB-HR-Platform-Cloud-Vault') {
      const drive = await this.getDriveClient();
      const folderId = await this.getOrCreateFolder(folderName);
      await drive.permissions.create({
          fileId: folderId,
          requestBody: { role: 'writer', type: 'user', emailAddress: email }
      });
  }

  // --- CALENDAR METHODS (Scheduling) ---

  static async scheduleEvent(details: { 
    summary: string, 
    description: string, 
    startTime: string, 
    endTime: string, 
    attendees: string[] 
  }) {
    const calendar = await this.getCalendarClient();
    const event = {
      summary: details.summary,
      description: details.description,
      start: { dateTime: details.startTime, timeZone: 'UTC' },
      end: { dateTime: details.endTime, timeZone: 'UTC' },
      attendees: details.attendees.map(email => ({ email })),
      conferenceData: {
        createRequest: { requestId: `nx_conf_${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    return response.data;
  }

  // --- MAINTENANCE & HEALTH ---

  static async checkHealth(): Promise<{ status: 'Healthy' | 'Error' | 'Disconnected'; message?: string }> {
      try {
          const drive = await this.getDriveClient();
          await drive.about.get({ fields: 'user' });
          return { status: 'Healthy' };
      } catch (e: any) { 
          return { status: 'Error', message: e.message }; 
      }
  }
}
