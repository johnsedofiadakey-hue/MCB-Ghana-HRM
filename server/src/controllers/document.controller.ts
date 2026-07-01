import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getEmployeeDocuments = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: req.params.id, organizationId },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const { title, category, fileUrl, mimeType } = req.body;
    if (!title || !category || !fileUrl) return res.status(400).json({ error: 'Missing required fields' });

    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';

    // If the client sent a base64 data URI, upload to Firebase Storage for permanent persistence
    // Falls back to storing the data URI directly if Firebase is unavailable
    let storedUrl = fileUrl;
    if (fileUrl.startsWith('data:')) {
      try {
        const { FirebaseStorageService } = await import('../services/firebase-storage.service');
        const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const detectedMime = mimeType || match[1];
          const ext = detectedMime.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
          const buffer = Buffer.from(match[2], 'base64');
          storedUrl = await FirebaseStorageService.uploadFile(
            buffer,
            `doc-${req.params.id}-${Date.now()}.${ext}`,
            'employee-documents',
            detectedMime
          );
        }
      } catch (fbErr) {
        console.warn('[DocumentController] Firebase upload failed, storing base64 in DB:', fbErr);
        // storedUrl stays as the data URI — still works, just less efficient
      }
    }

    const doc = await prisma.employeeDocument.create({
      data: { organizationId, employeeId: req.params.id, title, category, fileUrl: storedUrl }
    });
    res.json(doc);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    await prisma.employeeDocument.deleteMany({ 
      where: { id: req.params.id, organizationId } 
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

export const signDocument = async (req: Request, res: Response) => {
  try {
    const userReq = (req as any).user;
    const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
    const documentId = req.params.id;

    // 1. Fetch user signature
    const user = await prisma.user.findFirst({
        where: { id: userReq.id, organizationId },
        select: { signatureUrl: true, fullName: true, id: true }
    });
    if (!user || !user.signatureUrl) {
        return res.status(400).json({ error: 'No digital signature registered. Please configure your identity in your profile first.' });
    }

    // 2. Fetch document
    const doc = await prisma.employeeDocument.findFirst({
        where: { id: documentId, employeeId: userReq.id, organizationId }
    });
    if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
    }
    if (!doc.fileUrl.toLowerCase().includes('.pdf')) {
        return res.status(400).json({ error: 'Only PDF documents can be digitally signed' });
    }

    // 3. Import dependencies dynamically
    const { PDFDocument } = await import('pdf-lib');
    const { storageService } = await import('../services/firebase-storage.service');
    const { logAction } = await import('../services/audit.service');

    // 4. Download PDF
    const pdfResponse = await fetch(doc.fileUrl);
    if (!pdfResponse.ok) throw new Error('Failed to download source PDF');
    const pdfBuffer = await pdfResponse.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    // 5. Fetch or parse Signature Image
    let signatureBuffer: ArrayBuffer;
    if (user.signatureUrl.startsWith('data:image')) {
        const base64Data = user.signatureUrl.replace(/^data:image\/\w+;base64,/, '');
        const nodeBuffer = Buffer.from(base64Data, 'base64');
        signatureBuffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength);
    } else {
        const sigResponse = await fetch(user.signatureUrl);
        if (!sigResponse.ok) throw new Error('Failed to fetch signature image');
        signatureBuffer = await sigResponse.arrayBuffer();
    }

    // Embed Image - WebP or PNG handling
    let signatureImage;
    if (user.signatureUrl.includes('webp') || user.signatureUrl.includes('image/webp')) {
         // Fallback if pdf-lib doesn't natively do webp cleanly - theoretically it doesn't. 
         // Assuming our platform stores avatars as webp but Canvas produces PNG. 
         // For safety let's assume pdf-lib only handles PNG/JPG well.
         // Let's use sharp to convert to PNG first.
         const sharp = (await import('sharp')).default;
         const pngBuffer = await sharp(Buffer.from(signatureBuffer)).png().toBuffer();
         signatureImage = await pdfDoc.embedPng(pngBuffer);
    } else if (user.signatureUrl.includes('jpeg') || user.signatureUrl.includes('jpg')) {
         signatureImage = await pdfDoc.embedJpg(signatureBuffer);
    } else {
         try {
             signatureImage = await pdfDoc.embedPng(signatureBuffer);
         } catch {
             // Ultimate fallback conversion if parsing fails
             const sharp = (await import('sharp')).default;
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
    const updatedDoc = await prisma.employeeDocument.update({
        where: { id: documentId },
        data: { fileUrl: newFileUrl, title: `[Signed] ${doc.title}` }
    });

    // 9. Log Audit Trail
    await logAction(user.id, 'DOCUMENT_SIGNED', 'EmployeeDocument', documentId, { title: doc.title }, req.ip);

    res.json({ success: true, document: updatedDoc });
  } catch (error: any) {
    console.error('[Document Signing Error]:', error);
    res.status(500).json({ error: 'Failed to process digital signature: ' + error.message });
  }
};
