import { admin, initializeFirebase } from './firebase-admin';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling permanent media storage via Firebase Storage.
 * This ensures files are persisted independently of the ephemeral application server.
 */
export class FirebaseStorageService {
  private static bucket: any;

  private static init() {
    try {
      initializeFirebase();
      if (admin.apps.length > 0) {
        this.bucket = admin.storage().bucket();
        console.log('[FirebaseStorage] Connected to bucket:', this.bucket.name);
      } else {
        console.warn('[FirebaseStorage] Skipping initialization: No Firebase app found.');
      }
    } catch (error) {
      console.error('[FirebaseStorage] Initialization failed:', error);
    }
  }

  /**
   * Upload logo (Used by upload.routes.ts)
   */
  static async uploadLogo(file: any): Promise<string> {
    if (!this.bucket) this.init();
    if (!this.bucket) throw new Error('Cloud storage not configured');

    const ext = file.originalname.split('.').pop();
    const fileName = `logos/${uuidv4()}.${ext}`;
    const bucketFile = this.bucket.file(fileName);

    await bucketFile.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      resumable: false,
    });

    await bucketFile.makePublic();
    return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
  }

  /**
   * General file upload service method
   */
  static async uploadFile(buffer: Buffer, originalName: string, folder: string = 'uploads', mimetype?: string): Promise<string> {
    if (!this.bucket) this.init();
    if (!this.bucket) throw new Error('Cloud storage not configured');

    const ext = originalName.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${ext}`;
    const file = this.bucket.file(fileName);

    await file.save(buffer, {
      resumable: false,
      metadata: mimetype ? { contentType: mimetype } : undefined
    });

    try {
      await file.makePublic();
    } catch (e) {
      console.warn('[FirebaseStorage] makePublic failed (likely uniform bucket access), using default access');
    }
    
    return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
  }

  /**
   * Delete a file from Firebase Storage.
   */
  static async deleteFile(url: string): Promise<void> {
    if (!this.bucket) this.init();
    if (!this.bucket || !url.includes(this.bucket.name)) return;
    
    try {
      const filePath = url.split(`${this.bucket.name}/`)[1];
      if (filePath) {
        await this.bucket.file(filePath).delete();
      }
    } catch (error) {
      console.warn(`[FirebaseStorage] Deletion failed for ${url}:`, error);
    }
  }
}

// Instance fallback for controller usage
export const storageService = FirebaseStorageService;
