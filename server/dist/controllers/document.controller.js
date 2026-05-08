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
exports.signDocument = exports.deleteDocument = exports.uploadDocument = exports.getEmployeeDocuments = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getEmployeeDocuments = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const docs = await client_1.default.employeeDocument.findMany({
            where: { employeeId: req.params.id, organizationId },
            orderBy: { uploadedAt: 'desc' }
        });
        res.json(docs);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};
exports.getEmployeeDocuments = getEmployeeDocuments;
const uploadDocument = async (req, res) => {
    try {
        const { title, category, fileUrl } = req.body;
        if (!title || !category || !fileUrl)
            return res.status(400).json({ error: 'Missing required fields' });
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        const doc = await client_1.default.employeeDocument.create({
            data: {
                organizationId,
                employeeId: req.params.id,
                title,
                category,
                fileUrl
            }
        });
        res.json(doc);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
};
exports.uploadDocument = uploadDocument;
const deleteDocument = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
        await client_1.default.employeeDocument.deleteMany({
            where: { id: req.params.id, organizationId }
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
exports.deleteDocument = deleteDocument;
const signDocument = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const documentId = req.params.id;
        // 1. Fetch user signature
        const user = await client_1.default.user.findFirst({
            where: { id: userReq.id, organizationId },
            select: { signatureUrl: true, fullName: true, id: true }
        });
        if (!user || !user.signatureUrl) {
            return res.status(400).json({ error: 'No digital signature registered. Please configure your identity in your profile first.' });
        }
        // 2. Fetch document
        const doc = await client_1.default.employeeDocument.findFirst({
            where: { id: documentId, employeeId: userReq.id, organizationId }
        });
        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }
        if (!doc.fileUrl.toLowerCase().includes('.pdf')) {
            return res.status(400).json({ error: 'Only PDF documents can be digitally signed' });
        }
        // 3. Import dependencies dynamically
        const { PDFDocument } = await Promise.resolve().then(() => __importStar(require('pdf-lib')));
        const { storageService } = await Promise.resolve().then(() => __importStar(require('../services/firebase-storage.service')));
        const { logAction } = await Promise.resolve().then(() => __importStar(require('../services/audit.service')));
        // 4. Download PDF
        const pdfResponse = await fetch(doc.fileUrl);
        if (!pdfResponse.ok)
            throw new Error('Failed to download source PDF');
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];
        // 5. Fetch or parse Signature Image
        let signatureBuffer;
        if (user.signatureUrl.startsWith('data:image')) {
            const base64Data = user.signatureUrl.replace(/^data:image\/\w+;base64,/, '');
            const nodeBuffer = Buffer.from(base64Data, 'base64');
            signatureBuffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
        }
        else {
            const sigResponse = await fetch(user.signatureUrl);
            if (!sigResponse.ok)
                throw new Error('Failed to fetch signature image');
            signatureBuffer = await sigResponse.arrayBuffer();
        }
        // Embed Image - WebP or PNG handling
        let signatureImage;
        if (user.signatureUrl.includes('webp') || user.signatureUrl.includes('image/webp')) {
            // Fallback if pdf-lib doesn't natively do webp cleanly - theoretically it doesn't. 
            // Assuming our platform stores avatars as webp but Canvas produces PNG. 
            // For safety let's assume pdf-lib only handles PNG/JPG well.
            // Let's use sharp to convert to PNG first.
            const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
            const pngBuffer = await sharp(Buffer.from(signatureBuffer)).png().toBuffer();
            signatureImage = await pdfDoc.embedPng(pngBuffer);
        }
        else if (user.signatureUrl.includes('jpeg') || user.signatureUrl.includes('jpg')) {
            signatureImage = await pdfDoc.embedJpg(signatureBuffer);
        }
        else {
            try {
                signatureImage = await pdfDoc.embedPng(signatureBuffer);
            }
            catch {
                // Ultimate fallback conversion if parsing fails
                const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
                const pngBuffer = await sharp(Buffer.from(signatureBuffer)).png().toBuffer();
                signatureImage = await pdfDoc.embedPng(pngBuffer);
            }
        }
        // 6. Draw the signature onto the page (Bottom Right layout)
        const { width, height } = lastPage.getSize();
        // Scale image down if it's too large
        const signatureDims = signatureImage.scale(0.3);
        lastPage.drawImage(signatureImage, {
            x: width - signatureDims.width - 50,
            y: 50,
            width: signatureDims.width,
            height: signatureDims.height
        });
        // Option: Draw text overlay (Audit timestamp)
        lastPage.drawText(`Signed by: ${user.fullName}`, { x: width - signatureDims.width - 50, y: 35, size: 8 });
        lastPage.drawText(`Date: ${new Date().toISOString()}`, { x: width - signatureDims.width - 50, y: 25, size: 8 });
        // 7. Save and re-upload Document
        const modifiedPdfBytes = await pdfDoc.save();
        const newFileName = `signed-${user.id}-${Date.now()}.pdf`;
        const newFileUrl = await storageService.uploadFile(Buffer.from(modifiedPdfBytes), newFileName, 'documents');
        // 8. Update DB Record
        const updatedDoc = await client_1.default.employeeDocument.update({
            where: { id: documentId },
            data: { fileUrl: newFileUrl, title: `[Signed] ${doc.title}` }
        });
        // 9. Log Audit Trail
        await logAction(user.id, 'DOCUMENT_SIGNED', 'EmployeeDocument', documentId, { title: doc.title }, req.ip);
        res.json({ success: true, document: updatedDoc });
    }
    catch (error) {
        console.error('[Document Signing Error]:', error);
        res.status(500).json({ error: 'Failed to process digital signature: ' + error.message });
    }
};
exports.signDocument = signDocument;
