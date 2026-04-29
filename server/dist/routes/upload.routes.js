"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const multer_1 = __importDefault(require("multer"));
const client_1 = __importDefault(require("../prisma/client"));
const firebase_storage_service_1 = require("../services/firebase-storage.service");
const router = (0, express_1.Router)();
// Buffer storage for initial upload processing
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});
router.post('/logo', auth_middleware_1.authenticate, upload.single('logo'), async (req, res) => {
    try {
        console.log('[Upload] Request initiated by user:', req.user?.id, '| Role:', req.user?.role);
        const orgId = req.user?.organizationId || 'mcb-ghana-tenant';
        console.log('[Upload] Resolved Organization ID:', orgId);
        let logoUrl = '';
        let storageType = 'cloud';
        let buffer = null;
        let mimetype = 'image/png';
        // 1. Resolve source: Multi-part file OR Base64 string from body
        if (req.file) {
            buffer = req.file.buffer;
            mimetype = req.file.mimetype;
        }
        else if (req.body.image) {
            const match = req.body.image.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                mimetype = match[1];
                buffer = Buffer.from(match[2], 'base64');
            }
            else {
                // Raw base64 or failed match
                buffer = Buffer.from(req.body.image, 'base64');
            }
        }
        if (!buffer)
            return res.status(400).json({ success: false, message: 'No image data provided' });
        try {
            // 2. Attempt Cloud Upload (Firebase)
            logoUrl = await firebase_storage_service_1.FirebaseStorageService.uploadFile(buffer, `logo-${orgId}-${Date.now()}.webp`, 'branding', mimetype);
            console.log('[Upload] Cloud upload successful:', logoUrl);
        }
        catch (firebaseError) {
            console.warn('[Upload] Firebase failed, falling back to Database Base64 storage:', firebaseError);
            // 3. Fallback: Save as Base64 Data URI instead of Disk (to survive Render deployments)
            const base64 = buffer.toString('base64');
            logoUrl = `data:image/webp;base64,${base64}`;
            storageType = 'database';
        }
        console.log('[Upload] Final Logo URL length:', logoUrl.length, '| Type:', storageType);
        // 4. Update Database with the new URL
        const organization = await client_1.default.organization.findUnique({ where: { id: orgId } });
        const oldLogo = organization?.logoUrl;
        await client_1.default.organization.update({
            where: { id: orgId },
            data: { logoUrl }
        });
        // 5. Cleanup old cloud assets if we just moved to a new cloud one
        if (storageType === 'cloud' && oldLogo && oldLogo.includes('storage.googleapis.com')) {
            try {
                await firebase_storage_service_1.FirebaseStorageService.deleteFile(oldLogo);
            }
            catch (e) { }
        }
        res.json({
            success: true,
            logoUrl,
            storage: storageType,
            message: storageType === 'database'
                ? 'Logo preserved in database. (Cloud storage unavailable)'
                : 'Logo synchronized to Global Cloud Storage'
        });
    }
    catch (error) {
        console.error('Critical Upload Error:', error);
        res.status(500).json({ success: false, message: 'Upload system encounterd a critical failure', error: error.message });
    }
});
exports.default = router;
