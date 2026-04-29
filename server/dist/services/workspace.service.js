"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleWorkspaceService = void 0;
const googleapis_1 = require("googleapis");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("dotenv/config");
/**
 * Google Workspace Service (Enterprise Version)
 * MCB-HRM Ghana — Unified Cloud Archival & Autonomous Scheduling
 */
class GoogleWorkspaceService {
    static async getAuth() {
        let auth;
        if (process.env.GOOGLE_DRIVE_KEY_JSON) {
            auth = new googleapis_1.google.auth.GoogleAuth({
                credentials: JSON.parse(process.env.GOOGLE_DRIVE_KEY_JSON),
                scopes: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/calendar.events'
                ],
            });
        }
        else {
            if (!fs_1.default.existsSync(this.KEY_PATH))
                throw new Error('Google Workspace credentials missing');
            auth = new googleapis_1.google.auth.GoogleAuth({
                keyFile: this.KEY_PATH,
                scopes: [
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/calendar.events'
                ],
            });
        }
        return auth;
    }
    static async getDriveClient() {
        if (this.driveClient)
            return this.driveClient;
        const auth = await this.getAuth();
        const authClient = await auth.getClient();
        this.driveClient = googleapis_1.google.drive({ version: 'v3', auth: authClient });
        return this.driveClient;
    }
    static async getCalendarClient() {
        if (this.calendarClient)
            return this.calendarClient;
        const auth = await this.getAuth();
        const authClient = await auth.getClient();
        this.calendarClient = googleapis_1.google.calendar({ version: 'v3', auth: authClient });
        return this.calendarClient;
    }
    // --- DRIVE METHODS (Archival & Sync) ---
    static async uploadToDrive(localPath, folderName = 'MCB-HR-Platform-Cloud-Vault') {
        return this.syncFileToCloud(localPath, folderName);
    }
    static async syncFileToCloud(localPath, folderName = 'MCB-HR-Platform-Cloud-Vault') {
        try {
            const drive = await this.getDriveClient();
            const folderId = await this.getOrCreateFolder(folderName);
            const filename = path_1.default.basename(localPath);
            const fileMetadata = { name: filename, parents: [folderId] };
            const media = { body: fs_1.default.createReadStream(localPath) };
            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log(`[GoogleWorkspace] Sync Complete: ${filename} -> ${response.data.id}`);
            await this.pruneOldBackups(folderId); // Maintenance logic
            return response.data.id;
        }
        catch (error) {
            console.error('[GoogleWorkspace] Sync Failed:', error.message);
            throw error;
        }
    }
    static async getOrCreateFolder(name) {
        const drive = await this.getDriveClient();
        const listRes = await drive.files.list({
            q: `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id)',
        });
        const existing = listRes.data.files?.[0];
        if (existing?.id)
            return existing.id;
        const folder = await drive.files.create({
            resource: { name, mimeType: 'application/vnd.google-apps.folder' },
            fields: 'id',
        });
        return folder.data.id;
    }
    static async pruneOldBackups(folderId) {
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
        }
        catch (e) {
            console.warn('[GoogleWorkspace] Pruning Warning:', e.message);
        }
    }
    static async shareFolderWithUser(email, folderName = 'MCB-HR-Platform-Cloud-Vault') {
        const drive = await this.getDriveClient();
        const folderId = await this.getOrCreateFolder(folderName);
        await drive.permissions.create({
            fileId: folderId,
            requestBody: { role: 'writer', type: 'user', emailAddress: email }
        });
    }
    // --- CALENDAR METHODS (Scheduling) ---
    static async scheduleEvent(details) {
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
    static async checkHealth() {
        try {
            const drive = await this.getDriveClient();
            await drive.about.get({ fields: 'user' });
            return { status: 'Healthy' };
        }
        catch (e) {
            return { status: 'Error', message: e.message };
        }
    }
}
exports.GoogleWorkspaceService = GoogleWorkspaceService;
GoogleWorkspaceService.driveClient = null;
GoogleWorkspaceService.calendarClient = null;
GoogleWorkspaceService.KEY_PATH = path_1.default.join(process.cwd(), 'google-drive-key.json');
