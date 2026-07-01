import PDFDocument from 'pdfkit';
import axios from 'axios';
import prisma from '../prisma/client';
import { getEffectiveLeaveMetrics } from '../utils/leave.utils';
import { FirebaseStorageService } from './firebase-storage.service';
import { errorLogger } from './error-log.service';
import { 
  PdfOrganization, 
  PdfTargetContent, 
  PdfAppraisalContent, 
  PdfLeaveContent, 
  PdfPayslipContent, 
  PdfBoardReportContent 
} from '../types/pdf.types';

export class PdfExportService {
  private static readonly SAFE_MARGIN = 50;
  private static readonly CONTENT_WIDTH = 500;

  /**
   * Generates a premium, branded PDF for various document types.
   */
  static async generateBrandedPdf(
    organizationId: string, 
    title: string, 
    content: PdfTargetContent | PdfTargetContent[] | PdfAppraisalContent | PdfLeaveContent | PdfPayslipContent | PdfBoardReportContent, 
    type: 'TARGET' | 'APPRAISAL' | 'LEAVE' | 'PAYSLIP' | 'TARGET_ROADMAP' | 'BOARD_REPORT'
  ): Promise<Buffer> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId || 'mcb-ghana-tenant' },
      select: {
        name: true,
        logoUrl: true,
        primaryColor: true,
        address: true,
        phone: true,
        email: true,
        city: true,
        country: true
      }
    }) as unknown as PdfOrganization | null;

    const doc = new PDFDocument({ 
      margin: 50, 
      size: 'A4',
      bufferPages: true 
    });

    const primaryColor = org?.primaryColor || '#4F46E5';
    const buffers: Buffer[] = [];

    return new Promise(async (resolve, reject) => {
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      try {
        // --- 1. Header Rendering ---
        await this.renderHeader(doc, org, primaryColor);
        
        doc.moveDown(5);
        doc
          .fillColor(primaryColor)
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH });

        doc.moveDown(0.5);
        const lineY = doc.y;
        doc
          .strokeColor(primaryColor)
          .lineWidth(1.5)
          .moveTo(100, lineY)
          .lineTo(500, lineY)
          .stroke();

        doc.moveDown(3);

        // --- 2. Document Content Selection ---
        switch (type) {
          case 'TARGET':
            this.renderTargetContent(doc, content as PdfTargetContent, primaryColor);
            break;
          case 'TARGET_ROADMAP':
            const targets = content as PdfTargetContent[];
            this.renderRoadmapSummary(doc, targets, primaryColor);
            for (const target of targets) {
              doc.addPage();
              this.renderTargetContent(doc, target, primaryColor);
            }
            break;
          case 'APPRAISAL':
            await this.renderAppraisalContent(doc, content as PdfAppraisalContent, primaryColor);
            break;
          case 'LEAVE':
            await this.renderLeaveContent(doc, content as PdfLeaveContent, primaryColor);
            break;
          case 'PAYSLIP':
            this.renderPayslipContent(doc, content as PdfPayslipContent, primaryColor);
            break;
          case 'BOARD_REPORT':
            this.renderBoardReportContent(doc, content as PdfBoardReportContent, primaryColor);
            break;
        }

        // --- 3. Finalization Overlay ---
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          doc.switchToPage(i);
          this.renderWatermark(doc);
          this.renderFooter(doc, org, i + 1, range.count, primaryColor);
        }

        doc.end();
      } catch (err) {
        console.error('[PdfExportService] Logic Crash:', err);
        doc.end();
        reject(err);
      }
    });
  }

  private static async renderHeader(doc: PDFKit.PDFDocument, org: PdfOrganization | null, primaryColor: string) {
    const pageWidth = doc.page.width;
    const margin = this.SAFE_MARGIN;
    const logoWidth = 100;
    const headerTop = 35;

    try {
      // --- Logo Rendering (Extreme Right) ---
      if (org?.logoUrl) {
        const xPos = pageWidth - margin - logoWidth;

        // Resolve raw bytes regardless of source (base64 data URI or remote URL)
        let rawBuffer: Buffer | null = null;
        if (org.logoUrl.startsWith('data:image')) {
          const b64 = org.logoUrl.split(',')[1];
          if (b64) rawBuffer = Buffer.from(b64, 'base64');
        } else {
          let absoluteLogoUrl = org.logoUrl;
          if (!absoluteLogoUrl.startsWith('http')) {
            const apiOrigin = process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://mcb-ghana-hrm-api.onrender.com';
            absoluteLogoUrl = `${apiOrigin.replace(/\/$/, '')}${absoluteLogoUrl.startsWith('/') ? '' : '/'}${absoluteLogoUrl}`;
          }
          const response = await axios.get(absoluteLogoUrl, { responseType: 'arraybuffer', timeout: 8000 });
          rawBuffer = Buffer.from(response.data);
        }

        if (rawBuffer) {
          // PDFKit only supports PNG and JPEG — convert via sharp so WebP/SVG/etc. all work
          const sharp = (await import('sharp')).default;
          const pngBuffer = await sharp(rawBuffer).png().toBuffer();
          doc.image(pngBuffer, xPos, headerTop, { width: logoWidth });
        }
      }
    } catch (err) {
      console.warn('[PdfExportService] Logo render failed, using text fallback:', (err as any)?.message);
      // Fallback Branding on the Right if logo fails
      doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold').text(org?.name?.slice(0, 3).toUpperCase() || 'MCB', pageWidth - margin - 60, headerTop + 10, { width: 60, align: 'right' });
    }

    // --- Company Details (Left Aligned) ---
    doc
      .fillColor(primaryColor)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(org?.name?.toUpperCase() || 'MC-BAUCHEMIE GHANA', margin, headerTop + 5, { width: 350 });

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`${org?.address || 'Tema Industrial Area, Accra'}`, margin, headerTop + 30, { width: 350 })
      .text(`${org?.city || 'Tema'}, ${org?.country || 'Ghana'}`, margin, headerTop + 42, { width: 350 })
      .fillColor(primaryColor)
      .text(`Phone: ${org?.phone || '+233 (0) 303 309 999'} | Email: ${org?.email || 'info@mc-bauchemie.com.gh'}`, margin, headerTop + 55, { width: 350 });

    // Decorative Header Line
    doc
      .strokeColor(primaryColor)
      .opacity(0.2)
      .lineWidth(0.5)
      .moveTo(margin, 115)
      .lineTo(pageWidth - margin, 115)
      .stroke()
      .opacity(1);
  }

  private static renderWatermark(doc: PDFKit.PDFDocument) {
    doc.save();
    doc.opacity(0.04);
    doc.fontSize(60).fillColor('#000').font('Helvetica-Bold');
    doc.rotate(-45, { origin: [300, 400] });
    doc.text('OFFICIAL INSTITUTIONAL RECORD', 50, 400);
    doc.restore();
  }

  private static renderFooter(doc: PDFKit.PDFDocument, org: PdfOrganization | null, page: number, total: number, primaryColor: string) {
    doc
      .strokeColor('#f1f5f9')
      .lineWidth(0.5)
      .moveTo(50, 780)
      .lineTo(550, 780)
      .stroke();

    const footerText = `Institutional Record | ${org?.name || 'MC-BAUCHEMIE GHANA'} | Page ${page} of ${total}`;
    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(footerText, this.SAFE_MARGIN, 790, { align: 'center', width: this.CONTENT_WIDTH });
  }

  private static renderTargetContent(doc: PDFKit.PDFDocument, target: PdfTargetContent, brandColor: string) {
    const headerTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, headerTop, this.CONTENT_WIDTH, 60).fill();
    
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold');
    doc.text('TARGET HOLDER:', this.SAFE_MARGIN + 15, headerTop + 15, { continued: true }).font('Helvetica').text(` ${target.assignee?.fullName || 'N/A'}`);
    doc.font('Helvetica-Bold').text('DEPARTMENT:', this.SAFE_MARGIN + 15, headerTop + 35, { continued: true }).font('Helvetica').text(` ${target.department?.name || 'Global Operations'}`);
    
    doc.font('Helvetica-Bold').text('CURRENT PROGRESS:', this.SAFE_MARGIN + 300, headerTop + 25, { width: 185, align: 'right' });
    doc.font('Helvetica').text(`${target.progress}% ACHIEVEMENT`, { width: 185, align: 'right' });
    
    doc.y = headerTop + 75;
    doc.moveDown(4);

    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('OBJECTIVE SPECIFICATION', this.SAFE_MARGIN);
    doc.moveDown(0.5);
    doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 1.5).fill(brandColor);
    doc.moveDown(1);
    doc.fillColor('#334155').fontSize(11).font('Helvetica').text(target.description || 'No exhaustive mapping provided.', { align: 'left', lineGap: 3, width: this.CONTENT_WIDTH });

    doc.moveDown(2);

    if (target.metrics && target.metrics.length > 0) {
      doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('STRATEGIC KEY PERFORMANCE INDICATORS (KPIs)');
      doc.moveDown();
      
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill('#f1f5f9');
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold');
      doc.text('METRIC COMPONENT', 65, tableTop + 8);
      doc.text('ALLOCATION', 250, tableTop + 8);
      doc.text('ACTUAL', 350, tableTop + 8);
      doc.text('VARIANCE', 450, tableTop + 8);

      let currentY = tableTop + 25;
      target.metrics.forEach((m, i) => {
        const rowHeight = 30;
        if (currentY > 700) { doc.addPage(); currentY = 50; }
        
        doc.fillColor(i % 2 === 0 ? '#ffffff' : '#f9fafb').rect(50, currentY, 500, rowHeight).fill();
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(m.title, 65, currentY + 10, { width: 180 });
        doc.text(`${m.targetValue} ${m.unit || ''}`, 250, currentY + 10);
        doc.text(`${m.currentValue} ${m.unit || ''}`, 350, currentY + 10);
        
        const variance = m.targetValue > 0 ? Math.round(((m.currentValue - m.targetValue) / m.targetValue) * 100) : 0;
        doc.fillColor(variance >= 0 ? '#059669' : '#dc2626').font('Helvetica-Bold').text(`${variance > 0 ? '+' : ''}${variance}%`, 450, currentY + 10);

        currentY += rowHeight;
      });
      doc.y = currentY + 30;
    }

    doc.moveDown(2);
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 45).fill();
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('INSTITUTIONAL SANCTION:', this.SAFE_MARGIN + 15, doc.y - 35);
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text('This objective is officially recognized and synchronized with organization-wide strategic KPIs for the current fiscal period.', this.SAFE_MARGIN + 15, doc.y + 5, { width: this.CONTENT_WIDTH - 30 });
    
    doc.moveDown(4);
    
    const sigY = doc.y;
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(230, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('ASSIGNEE ENDORSEMENT', 70, sigY + 8);
    
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(530, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('DIRECTOR / LINE MANAGER', 370, sigY + 8);
  }

  private static renderRoadmapSummary(doc: PDFKit.PDFDocument, targets: PdfTargetContent[], brandColor: string) {
    doc.fillColor(brandColor).fontSize(16).font('Helvetica-Bold').text('EXECUTIVE ROADMAP SUMMARY', this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH });
    doc.moveDown(0.5);
    doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 2).fill(brandColor);
    doc.moveDown(2);

    const totalTargets = targets.length;
    const completed = targets.filter(t => t.progress >= 100).length;
    const avgProgress = Math.round(targets.reduce((acc, t) => acc + (t.progress || 0), 0) / (totalTargets || 1));

    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 80).fill();
    this.keyValGrid(doc, this.SAFE_MARGIN + 20, doc.y - 65, 'TOTAL INITIATIVES', totalTargets.toString());
    this.keyValGrid(doc, this.SAFE_MARGIN + 170, doc.y - 12, 'AGGREGATE COMPLETION', `${avgProgress}%`);
    this.keyValGrid(doc, this.SAFE_MARGIN + 350, doc.y - 12, 'COMPLETED RECORDS', completed.toString());

    doc.moveDown(6);

    doc.fillColor(brandColor).fontSize(12).font('Helvetica-Bold').text('STRATEGIC PHASE DISBURSEMENT');
    doc.moveDown();

    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 25).fill('#1e293b');
    doc.fillColor('#fff').fontSize(8).font('Helvetica-Bold');
    doc.text('OBJECTIVE IDENTIFIER', 65, tableTop + 8);
    doc.text('PHASE STATUS', 300, tableTop + 8);
    doc.text('PROGRESS', 480, tableTop + 8);

    let currentY = tableTop + 25;
    targets.forEach((t, i) => {
      if (currentY > 700) { doc.addPage(); currentY = 50; }
      doc.fillColor(i % 2 === 0 ? '#ffffff' : '#f9fafb').rect(50, currentY, 500, 35).fill();
      
      doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold').text(t.title.toUpperCase(), 65, currentY + 12, { width: 220, lineBreak: false });
      
      const statusLabel = t.progress >= 100 ? 'FINALIZED' : t.progress > 0 ? 'ACTIVE DEVELOPMENT' : 'INITIALIZED';
      doc.fillColor(t.progress >= 100 ? '#059669' : '#64748b').font('Helvetica-Bold').text(statusLabel, 300, currentY + 12);
      
      const barWidth = 60;
      doc.rect(480, currentY + 14, barWidth, 6).fill('#e2e8f0');
      doc.rect(480, currentY + 14, (t.progress / 100) * barWidth, 6).fill(brandColor);
      doc.fillColor('#1e293b').fontSize(8).text(`${t.progress}%`, 480, currentY + 4);
      
      currentY += 35;
    });

    doc.moveDown(3);
    if (doc.y > 600) doc.addPage();
    const summaryTop = doc.y;
    doc.fillColor('#f8fafc').rect(50, summaryTop, 500, 100).fill();
    doc.fillColor(brandColor).fontSize(11).font('Helvetica-Bold').text('MANAGEMENT SUMMARY', 65, summaryTop + 15);
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text('The above roadmap encapsulates the prioritized strategic vectors. All phases are synchronized with departmental goals.', 65, summaryTop + 35, { width: 470, lineGap: 4 });
  }

  private static async renderAppraisalContent(doc: PDFKit.PDFDocument, packet: PdfAppraisalContent, brandColor: string) {
    const idTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, idTop, this.CONTENT_WIDTH, 65).fill();
    
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold');
    doc.text(packet.employee?.fullName?.toUpperCase() || 'OFFICIAL RECORD', this.SAFE_MARGIN, idTop + 15, { align: 'center', width: this.CONTENT_WIDTH });
    
    doc.fontSize(9).font('Helvetica').fillColor('#64748b');
    doc.text(packet.cycle?.title || 'ANNUAL PERFORMANCE REVIEW', this.SAFE_MARGIN, idTop + 32, { align: 'center', width: this.CONTENT_WIDTH });
    
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold');
    doc.text(`SCORE: ${packet.finalScore ?? 'PENDING'} / 100`, this.SAFE_MARGIN, idTop + 45, { align: 'center', width: this.CONTENT_WIDTH });
    
    doc.y = idTop + 85;
    doc.moveDown(4);

    if (packet.reviews && packet.reviews.length > 0) {
      packet.reviews.forEach((review) => {
        if (doc.y > 650) doc.addPage();
        
        doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text(`${review.reviewStage.replace('_', ' ').toUpperCase()} EVALUATION`, this.SAFE_MARGIN, doc.y, { width: this.CONTENT_WIDTH });
        doc.moveDown(0.5);
        
        doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 1.5).fill('#f1f5f9');
        doc.moveDown(1);

        this.recordMetadata(doc, 'Arbitrator', review.reviewer?.fullName || 'Personnel (Self)');
        this.recordMetadata(doc, 'Rating Map', `${review.overallRating || 0} / 5.0`);
        
        doc.moveDown();
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text('Executive Summary:', this.SAFE_MARGIN);
        doc.fontSize(10).font('Helvetica').fillColor('#1e293b').text(review.summary || 'No transcript recorded.', { align: 'left', lineGap: 3, width: this.CONTENT_WIDTH });
        
        const sections = [
          { label: 'Key Strengths & Achievements', value: review.strengths || review.achievements },
          { label: 'Areas for Improvement', value: review.weaknesses },
          { label: 'Development & Growth Needs', value: review.developmentNeeds }
        ];

        sections.forEach(s => {
          if (s.value) {
            doc.moveDown(1.5);
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${s.label.toUpperCase()}:`, this.SAFE_MARGIN);
            doc.fontSize(10).font('Helvetica').fillColor('#334155').text(s.value, { align: 'left', lineGap: 3, width: this.CONTENT_WIDTH });
          }
        });

        if (review.responses) {
          try {
            const data = typeof review.responses === 'string' ? JSON.parse(review.responses) : review.responses;
            if (data.competencyScores) {
              doc.moveDown(2.5);
              doc.fontSize(10).font('Helvetica-Bold').fillColor(brandColor).text('PERFORMANCE STATEMENT & COMPETENCY AUDIT', this.SAFE_MARGIN);
              doc.moveDown(1);
              
              data.competencyScores.forEach((cat: any) => {
                if (doc.y > 700) doc.addPage();
                
                const avg = cat.categoryAverage || 0;
                const scoreLabel = avg >= 4.5 ? 'EXCEPTIONAL' : avg >= 4 ? 'HIGH PROFICIENCY' : avg >= 3 ? 'PROFICIENT' : avg >= 2 ? 'CORE COMPETENCE' : 'DEVELOPMENTAL';
                
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(cat.category.toUpperCase(), this.SAFE_MARGIN);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(brandColor).text(scoreLabel, { align: 'right', width: this.CONTENT_WIDTH });
                doc.moveDown(0.2);
                doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 0.5).fill('#e2e8f0');
                doc.moveDown(0.5);
                
                cat.competencies.forEach((c: any) => {
                  if (doc.y > 720) doc.addPage();
                  doc.fontSize(9).font('Helvetica-Bold').fillColor('#334155').text(c.name, this.SAFE_MARGIN + 10, doc.y, { continued: true });
                  doc.font('Helvetica').fillColor('#64748b').text(` -- Rating: ${c.score || 0}/5`);
                  
                  if (c.comment) {
                    doc.moveDown(0.2);
                    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#475569').text(`"${c.comment}"`, this.SAFE_MARGIN + 25, doc.y, { width: this.CONTENT_WIDTH - 35, lineGap: 2 });
                  }
                  doc.moveDown(0.4);
                });
                doc.moveDown(1);
              });
            }
          } catch (e) { }
        }
        doc.moveDown(3);
      });
    }

    const verdictText = packet.finalVerdict || 'This appraisal has been arbitrated and synchronized with the official personnel dossier.';
    const boxHeight = Math.max(85, doc.heightOfString(verdictText, { width: this.CONTENT_WIDTH - 30, lineGap: 2 }) + 45);

    if (doc.y + boxHeight > 700) doc.addPage();
    const sanctionTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, sanctionTop, this.CONTENT_WIDTH, boxHeight).fill();
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('OFFICIAL ARBITRATION:', this.SAFE_MARGIN + 15, sanctionTop + 15);
    doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text(verdictText, this.SAFE_MARGIN + 15, sanctionTop + 35, { width: this.CONTENT_WIDTH - 30, lineGap: 2 });
    
    if (sanctionTop + boxHeight + 80 > 750) { doc.addPage(); doc.moveDown(2); } else { doc.y = sanctionTop + boxHeight + 45; }
    
    const sigY = doc.y;
    if (packet.employee?.signatureUrl) await this.renderSignature(doc, packet.employee.signatureUrl, 70, sigY, 165);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(235, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('EMPLOYEE SIGN-OFF', 70, sigY + 8);
    
    const managementSig = packet.finalReviewer?.signatureUrl || packet.reviews?.find((r) => r.reviewStage === 'MANAGER')?.reviewer?.signatureUrl;
    if (managementSig) await this.renderSignature(doc, managementSig, 365, sigY, 165);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(365, sigY).lineTo(530, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('AUTHORIZED MANAGEMENT', 365, sigY + 8);
  }

  private static async renderSignature(doc: PDFKit.PDFDocument, sigUrl: string | null | undefined, xPos: number, yPos: number, lineWidth: number) {
     try {
       if (!sigUrl) return;
       
       const imgWidth = 110; 
       const centeredX = xPos + (lineWidth - imgWidth) / 2;

       if (sigUrl.startsWith('data:image')) {
         const b64 = sigUrl.split(',')[1];
         const img = Buffer.from(b64, 'base64');
         doc.image(img, centeredX, yPos - 35, { width: imgWidth, height: 40, fit: [imgWidth, 40] });
       } else {
         // Support for external signature URLs (Cloudinary/Firestore)
         const response = await axios.get(sigUrl, { 
           responseType: 'arraybuffer',
           timeout: 5000 
         });
         doc.image(response.data, centeredX, yPos - 35, { width: imgWidth, height: 40, fit: [imgWidth, 40] });
       }
     } catch (e) { 
        console.warn('[PdfExportService] Signature render failed', e);
     }
  }

  private static async renderLeaveContent(doc: PDFKit.PDFDocument, leave: PdfLeaveContent, brandColor: string) {
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica-Bold').text('LEAVE AUTHORIZATION SANCTION', this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH, characterSpacing: 2 });
    doc.moveDown(0.5);
    
    const statement = `This document confirms that ${leave.employee?.fullName} has been given permission for ${leave.leaveType} Leave from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}. coverage has been finalized to ensure stability.`;
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(statement, this.SAFE_MARGIN, doc.y, { align: 'center', width: this.CONTENT_WIDTH, lineGap: 4 });

    doc.moveDown(2);
    const gridTop = doc.y;
    this.keyValGrid(doc, 70, gridTop, 'Leave ID', leave.id.substring(0, 8).toUpperCase());
    this.keyValGrid(doc, 330, gridTop, 'Employee', leave.employee?.fullName || 'N/A');
    
    doc.moveDown(2);
    const nextRow = doc.y;
    this.keyValGrid(doc, 70, nextRow, 'Start Date', new Date(leave.startDate).toLocaleDateString());
    this.keyValGrid(doc, 330, nextRow, 'End Date', new Date(leave.endDate).toLocaleDateString());

    doc.moveDown(2);
    const lastRow = doc.y;
    this.keyValGrid(doc, 70, lastRow, 'Total Days', `${leave.leaveDays} Days`);
    const metrics = getEffectiveLeaveMetrics(leave.employee as any);
    this.keyValGrid(doc, 330, lastRow, 'Current Balance', `${metrics.balance} Days`);

    doc.moveDown(2.5);
    if (leave.reason) {
      doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('REASON FOR LEAVE', 70);
      doc.moveDown(0.3);
      doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text(leave.reason, 70, doc.y, { width: 450, align: 'justify' });
      doc.moveDown(1.5);
    }

    if (leave.reliever) {
      const relieverBoxTop = doc.y;
      doc.fillColor('#f8fafc').rect(50, relieverBoxTop, 500, 45).fill();
      doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('COVERAGE & HANDOVER', 70, relieverBoxTop + 10);
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(`Partner: ${leave.reliever.fullName} (${leave.relieverStatus})`, 70, relieverBoxTop + 22);
      doc.moveDown(2);
    }

    doc.moveDown(4);
    const sigY = doc.y;

    // Employee — always present
    if (leave.employee?.signatureUrl) await this.renderSignature(doc, leave.employee.signatureUrl, 55, sigY, 150);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(55, sigY).lineTo(205, sigY).stroke();
    doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(leave.employee?.fullName?.toUpperCase() || 'EMPLOYEE', 55, sigY + 8, { width: 150 });

    // Direct manager — only present for the regular-staff approval chain;
    // omitted for managers' own leave (no peer reviewer in that path)
    if (leave.manager) {
      if (leave.manager.signatureUrl) await this.renderSignature(doc, leave.manager.signatureUrl, 220, sigY, 150);
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(220, sigY).lineTo(370, sigY).stroke();
      doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(leave.manager.fullName?.toUpperCase() || 'LINE MANAGER', 220, sigY + 8, { width: 150 });
    }

    // Final approver — HR Director for regular staff, or HR Director/MD for the
    // manager path (hrReviewer carries whichever was the terminal approver)
    if (leave.hrReviewer) {
      const finalX = leave.manager ? 385 : 220;
      if (leave.hrReviewer.signatureUrl) await this.renderSignature(doc, leave.hrReviewer.signatureUrl, finalX, sigY, 150);
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(finalX, sigY).lineTo(finalX + 150, sigY).stroke();
      doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('FINAL APPROVAL SIGNATURE', finalX, sigY + 8, { width: 150 });
    }
  }

  private static keyValGrid(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string) {
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(value || 'N/A', x, y + 12);
  }

  private static renderPayslipContent(doc: PDFKit.PDFDocument, item: PdfPayslipContent, brandColor: string) {
    const currency = item.currency || 'GHS';
    const formatAmount = (val: number) => val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const headerTop = doc.y;
    doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, headerTop, this.CONTENT_WIDTH, 70).fill();
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(item.employee?.fullName?.toUpperCase() || 'OFFICIAL PAYSLIP', this.SAFE_MARGIN + 15, headerTop + 15);
    doc.fillColor(brandColor).fontSize(10).font('Helvetica-Bold').text('PAYMENT PERIOD', 350, headerTop + 15, { align: 'right', width: 185 });
    doc.fillColor('#1e293b').fontSize(12).font('Helvetica').text(item.run?.period || 'N/A', 350, headerTop + 28, { align: 'right', width: 185 });
    
    doc.moveDown(5);
    const tableTop = doc.y;
    doc.rect(50, tableTop, 500, 22).fill(brandColor);
    doc.fillColor('#fff').fontSize(9).font('Helvetica-Bold').text('EARNINGS & DEDUCTIONS', 65, tableTop + 7);

    let currentY = tableTop + 22;
    const drawRow = (label: string, value: number, isDeduction = false) => {
      doc.fillColor(currentY % 44 === 22 ? '#f9fafb' : '#ffffff').rect(50, currentY, 500, 22).fill();
      doc.fillColor('#334155').fontSize(9).font('Helvetica').text(label.toUpperCase(), 65, currentY + 7);
      doc.fillColor(isDeduction ? '#ef4444' : '#1e293b').font('Helvetica-Bold').text(`${isDeduction ? '-' : ''}${formatAmount(value)}`, 450, currentY + 7, { align: 'right', width: 85 });
      currentY += 22;
    };

    drawRow('Basic Salary', Number(item.baseSalary));
    if (Number(item.overtime)) drawRow('Overtime', Number(item.overtime));
    if (Number(item.bonus)) drawRow('Bonus', Number(item.bonus));
    if (Number(item.allowances)) drawRow('Taxable Allowances', Number(item.allowances));
    drawRow('Gross Pay', Number(item.grossPay));
    if (Number(item.expenseReimbursements)) drawRow('Expense Reimbursement (Non-taxable)', Number(item.expenseReimbursements));
    drawRow('SSNIT Employee Contribution', Number(item.ssnit), true);
    if (Number(item.tier2Pension)) drawRow('Tier 2 Pension', Number(item.tier2Pension), true);
    // Show pre-tax custom deductions before PAYE line
    const snapshot: any[] = Array.isArray((item as any).customDeductionsSnapshot) ? (item as any).customDeductionsSnapshot : [];
    for (const d of snapshot.filter((d: any) => d.taxTreatment === 'PRE_TAX' && d.type === 'DEDUCTION')) {
      drawRow(d.name, Number(d.amount), true);
    }
    drawRow('Income Tax (PAYE)', Number(item.tax), true);
    // Show post-tax custom deductions after PAYE
    for (const d of snapshot.filter((d: any) => d.taxTreatment === 'POST_TAX' && d.type === 'DEDUCTION')) {
      drawRow(d.name, Number(d.amount), true);
    }
    // Show employer contributions as neutral lines (no deduction marker)
    for (const d of snapshot.filter((d: any) => d.type === 'EMPLOYER_CONTRIBUTION')) {
      drawRow(`${d.name} (Employer)`, Number(d.amount));
    }
    // Legacy fallback: show otherDeductions lump sum only if no custom snapshot
    if (!snapshot.length && Number(item.otherDeductions)) drawRow('Other Deductions', Number(item.otherDeductions), true);
    drawRow('Net Payout', Number(item.netPay));
    
    doc.y = currentY + 30;
    const summaryTop = doc.y;
    doc.fillColor('#0f172a').rect(50, summaryTop, 500, 110).fill();
    doc.fillColor(brandColor).fontSize(9).font('Helvetica-Bold').text('NET PAYOUT', 360, summaryTop + 30, { characterSpacing: 2 });
    doc.fillColor('#fff').fontSize(28).font('Helvetica-Bold').text(`${currency} ${formatAmount(Number(item.netPay))}`, 360, summaryTop + 45);
  }

  private static renderBoardReportContent(doc: PDFKit.PDFDocument, data: PdfBoardReportContent, brandColor: string) {
    const margin = this.SAFE_MARGIN;
    const width = this.CONTENT_WIDTH;

    // --- Executive Title ---
    doc.moveDown(1);
    doc.fillColor('#0f172a').fontSize(26).font('Helvetica-Bold').text('EXECUTIVE BOARD SUMMARY', margin);
    doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(`FISCAL PERIOD: Q${Math.ceil((new Date().getMonth() + 1) / 3)} - ${new Date().getFullYear()}`, margin);
    
    doc.moveDown(2);

    // --- 1. Institutional Snapshot (Metric Cards) ---
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('INSTITUTIONAL PERFORMANCE SNAPSHOT', margin);
    doc.moveDown(0.5);
    doc.rect(margin, doc.y, width, 1.5).fill(brandColor);
    doc.moveDown(1.5);

    const cardWidth = (width - 40) / 3;
    const currentY = doc.y;
    this.drawMetricCard(doc, 'Total Headcount', String(data.totalEmployees), margin, currentY, cardWidth, brandColor);
    this.drawMetricCard(doc, 'Active Leaves', String(data.pendingLeaves), margin + cardWidth + 20, currentY, cardWidth, '#f59e0b');
    this.drawMetricCard(doc, 'Open Appraisals', String(data.pendingAppraisals), margin + (cardWidth + 20) * 2, currentY, cardWidth, '#10b981');

    doc.y = currentY + 90;

    // --- 2. Financial Vector ---
    doc.moveDown(2);
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('MACRO-FINANCIAL OUTFLOW', margin);
    doc.moveDown(0.5);
    doc.rect(margin, doc.y, width, 1.5).fill(brandColor);
    doc.moveDown(1.5);

    doc.fillColor('#f8fafc').rect(margin, doc.y, width, 80).fill();
    const financialY = doc.y - 70;
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('LATEST MONTHLY PAYROLL DISBURSEMENT', margin + 20, financialY);
    doc.fillColor('#1e293b').fontSize(32).font('Helvetica-Bold').text(`GHS ${data.payrollTotal.toLocaleString()}`, margin + 20, financialY + 15);
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('Calculated based on the last finalized and authorized payroll run.', margin + 20, financialY + 50);

    doc.y = financialY + 110;

    // --- 3. Strategic AI Insights (Cortex) ---
    doc.moveDown(2);
    doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('CORTEX STRATEGIC INSIGHTS', margin);
    doc.moveDown(0.5);
    doc.rect(margin, doc.y, width, 1.5).fill(brandColor);
    doc.moveDown(1.5);

    if (data.insights && data.insights.length > 0) {
      data.insights.forEach((insight, i) => {
        const top = doc.y;
        doc.fillColor('#f1f5f9').rect(margin, top, width, 45).fill();
        doc.fillColor(brandColor).fontSize(11).font('Helvetica-Bold').text(insight.label.toUpperCase(), margin + 15, top + 10);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text(insight.description, margin + 15, top + 25, { width: width - 30 });
        doc.moveDown(2);
      });
    }

    // --- 4. Official Validation ---
    doc.moveDown(4);
    if (doc.y > 650) doc.addPage();
    const sigY = doc.y + 50;
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(margin, sigY).lineTo(margin + 200, sigY).stroke();
    doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold').text('MANAGING DIRECTOR / CEO', margin, sigY + 10);

    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(margin + 300, sigY).lineTo(margin + 500, sigY).stroke();
    doc.fontSize(8).fillColor('#64748b').font('Helvetica-Bold').text('BOARD OF DIRECTORS (SANCTION)', margin + 300, sigY + 10);
  }

  private static drawMetricCard(doc: PDFKit.PDFDocument, title: string, value: string, x: number, y: number, width: number, color: string) {
    doc.roundedRect(x, y, width, 60, 8).fillColor('#f8fafc').fill();
    doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text(title.toUpperCase(), x + 10, y + 10, { width: width - 20, align: 'center' });
    doc.fillColor(color).fontSize(18).font('Helvetica-Bold').text(value, x + 10, y + 30, { width: width - 20, align: 'center' });
  }

  private static recordMetadata(doc: PDFKit.PDFDocument, label: string, value: string) {
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label.toUpperCase()}: `, this.SAFE_MARGIN, doc.y, { continued: true }).font('Helvetica').fillColor('#1e293b').text(value);
    doc.moveDown(0.2);
  }

  /**
   * Generates the leave approval letter and files it into every recipient's own
   * document register (EmployeeDocument). Called on terminal approval only
   * (hrValidation / mdFinalReview) — never blocks or rolls back the approval
   * itself if PDF generation or storage fails.
   */
  static async generateAndArchiveLeaveApprovalPdf(leaveId: string, recipientEmployeeIds: string[]) {
    try {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: leaveId },
        include: {
          employee: { include: { departmentObj: { select: { name: true } } } },
          reliever: { select: { fullName: true } },
          manager: { select: { fullName: true, signatureUrl: true } },
          hrReviewer: { select: { fullName: true, signatureUrl: true } },
          handoverRecords: { include: { reliever: { select: { fullName: true } } } },
        },
      });
      if (!leave) return;

      const organizationId = leave.organizationId || 'mcb-ghana-tenant';
      const buffer = await this.generateBrandedPdf(organizationId, 'Leave Authorization Certificate', leave as any, 'LEAVE');
      const fileUrl = await FirebaseStorageService.uploadFile(buffer, `leave-approval-${leaveId}.pdf`, 'leave-approvals', 'application/pdf');

      const uniqueRecipients = Array.from(new Set(recipientEmployeeIds.filter(Boolean)));
      const dateRange = `${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}`;
      const title = `Leave Approval Letter — ${leave.employee?.fullName || 'Employee'} (${dateRange})`;

      await prisma.employeeDocument.createMany({
        data: uniqueRecipients.map(employeeId => ({
          organizationId,
          employeeId,
          title,
          category: 'Leave Approval Letter',
          fileUrl,
        })),
      });
    } catch (e: any) {
      // PDF/storage failure must never affect the leave approval itself — log and move on.
      errorLogger.log('PdfExportService.generateAndArchiveLeaveApprovalPdf', e);
    }
  }
}
