import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../prisma/client';
import { FirebaseStorageService } from '../services/firebase-storage.service';

const router = Router();

// Buffer storage for initial upload processing
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } 
});


router.post('/logo', authenticate, upload.single('logo'), async (req: any, res: any) => {
  try {
    const orgId = req.user?.organizationId || 'default-tenant';
    let logoUrl = '';
    let storageType = 'cloud';
    let buffer: Buffer | null = null;
    let mimetype = 'image/png';

    // 1. Resolve source: Multi-part file OR Base64 string from body
    if (req.file) {
      buffer = req.file.buffer;
      mimetype = req.file.mimetype;
    } else if (req.body.image) {
      const match = req.body.image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimetype = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        // Raw base64 or failed match
        buffer = Buffer.from(req.body.image, 'base64');
      }
    }

    if (!buffer) return res.status(400).json({ success: false, message: 'No image data provided' });

    try {
      // 2. Attempt Cloud Upload (Firebase)
      logoUrl = await FirebaseStorageService.uploadFile(buffer, `logo-${orgId}-${Date.now()}.webp`, 'branding', mimetype);
      console.log('[Upload] Cloud upload successful:', logoUrl);
    } catch (firebaseError) {
      console.warn('[Upload] Firebase failed, falling back to Database Base64 storage:', firebaseError);
      
      // 3. Fallback: Save as Base64 Data URI instead of Disk (to survive Render deployments)
      const base64 = buffer.toString('base64');
      logoUrl = `data:image/webp;base64,${base64}`;
      storageType = 'database';
    }

    console.log('[Upload] Final Logo URL length:', logoUrl.length, '| Type:', storageType);

    // 4. Update Database with the new URL
    const organization = await prisma.organization.findUnique({ where: { id: orgId } });
    const oldLogo = organization?.logoUrl;

    await prisma.organization.update({
      where: { id: orgId },
      data: { logoUrl }
    });

    // 5. Cleanup old cloud assets if we just moved to a new cloud one
    if (storageType === 'cloud' && oldLogo && oldLogo.includes('storage.googleapis.com')) {
       try { await FirebaseStorageService.deleteFile(oldLogo); } catch(e){}
    }

    res.json({ 
      success: true, 
      logoUrl, 
      storage: storageType,
      message: storageType === 'database' 
        ? 'Logo preserved in database. (Cloud storage unavailable)' 
        : 'Logo synchronized to Global Cloud Storage' 
    });
  } catch (error: any) {
    console.error('Critical Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload system encounterd a critical failure', error: error.message });
  }
});

export default router;
