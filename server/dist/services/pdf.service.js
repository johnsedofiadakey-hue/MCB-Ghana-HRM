"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfExportService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const axios_1 = __importDefault(require("axios"));
const client_1 = __importDefault(require("../prisma/client"));
const leave_utils_1 = require("../utils/leave.utils");
class PdfExportService {
    /**
     * Generates a premium, branded PDF for various document types.
     */
    static async generateBrandedPdf(organizationId, title, content, type) {
        const org = await client_1.default.organization.findUnique({
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
        });
        const doc = new pdfkit_1.default({
            margin: 50,
            size: 'A4',
            bufferPages: true
        });
        const primaryColor = org?.primaryColor || '#4F46E5';
        const buffers = [];
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
                        this.renderTargetContent(doc, content, primaryColor);
                        break;
                    case 'TARGET_ROADMAP':
                        const targets = content;
                        this.renderRoadmapSummary(doc, targets, primaryColor);
                        for (const target of targets) {
                            doc.addPage();
                            this.renderTargetContent(doc, target, primaryColor);
                        }
                        break;
                    case 'APPRAISAL':
                        await this.renderAppraisalContent(doc, content, primaryColor);
                        break;
                    case 'LEAVE':
                        await this.renderLeaveContent(doc, content, primaryColor);
                        break;
                    case 'PAYSLIP':
                        this.renderPayslipContent(doc, content, primaryColor);
                        break;
                    case 'BOARD_REPORT':
                        this.renderBoardReportContent(doc, content, primaryColor);
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
            }
            catch (err) {
                console.error('[PdfExportService] Logic Crash:', err);
                doc.end();
                reject(err);
            }
        });
    }
    static async renderHeader(doc, org, primaryColor) {
        try {
            if (org?.logoUrl) {
                if (org.logoUrl.startsWith('data:image')) {
                    const b64 = org.logoUrl.split(',')[1];
                    if (b64)
                        doc.image(Buffer.from(b64, 'base64'), 50, 35, { width: 100 });
                }
                else {
                    try {
                        // Resolve absolute URL for relative paths
                        let absoluteLogoUrl = org.logoUrl;
                        if (!absoluteLogoUrl.startsWith('http')) {
                            const apiOrigin = process.env.VITE_API_URL || 'https://mcb-hrm-ghana-api.onrender.com';
                            absoluteLogoUrl = `${apiOrigin}${absoluteLogoUrl.startsWith('/') ? '' : '/'}${absoluteLogoUrl}`;
                        }
                        const response = await axios_1.default.get(absoluteLogoUrl, {
                            responseType: 'arraybuffer',
                            timeout: 10000
                        });
                        doc.image(response.data, 50, 35, { width: 100 });
                    }
                    catch (e) {
                        console.warn('[PdfExportService] Logo fetch failed, fallback to name branding:', org.logoUrl);
                        throw e;
                    }
                }
            }
        }
        catch (err) {
            console.warn('[PdfExportService] Header Branding Fallback triggered');
            doc.fontSize(22).fillColor(primaryColor).font('Helvetica-Bold').text(org?.name?.slice(0, 15).toUpperCase() || 'MCB-HRM', 50, 45);
        }
        doc
            .fillColor(primaryColor)
            .fontSize(18)
            .font('Helvetica-Bold')
            .text(org?.name?.toUpperCase() || 'MCB-HRM Ghana', this.SAFE_MARGIN, 43, { align: 'center', width: this.CONTENT_WIDTH })
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#64748b')
            .text(`${org?.address || ''} | ${org?.city || ''}, ${org?.country || ''}`, this.SAFE_MARGIN, 70, { align: 'center', width: this.CONTENT_WIDTH })
            .text(`Phone: ${org?.phone || ''} | Email: ${org?.email || ''}`, { align: 'center', width: this.CONTENT_WIDTH });
        doc
            .strokeColor('#f1f5f9')
            .lineWidth(0.5)
            .moveTo(this.SAFE_MARGIN, 115)
            .lineTo(595 - this.SAFE_MARGIN, 115)
            .stroke();
    }
    static renderWatermark(doc) {
        doc.save();
        doc.opacity(0.04);
        doc.fontSize(60).fillColor('#000').font('Helvetica-Bold');
        doc.rotate(-45, { origin: [300, 400] });
        doc.text('OFFICIAL INSTITUTIONAL RECORD', 50, 400);
        doc.restore();
    }
    static renderFooter(doc, org, page, total, primaryColor) {
        doc
            .strokeColor('#f1f5f9')
            .lineWidth(0.5)
            .moveTo(50, 780)
            .lineTo(550, 780)
            .stroke();
        const footerText = `Institutional Record | ${org?.name || 'MCB-HRM Ghana'} | Page ${page} of ${total}`;
        doc
            .fontSize(7)
            .fillColor('#94a3b8')
            .text(footerText, this.SAFE_MARGIN, 790, { align: 'center', width: this.CONTENT_WIDTH });
    }
    static renderTargetContent(doc, target, brandColor) {
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
                if (currentY > 700) {
                    doc.addPage();
                    currentY = 50;
                }
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
    static renderRoadmapSummary(doc, targets, brandColor) {
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
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }
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
        if (doc.y > 600)
            doc.addPage();
        const summaryTop = doc.y;
        doc.fillColor('#f8fafc').rect(50, summaryTop, 500, 100).fill();
        doc.fillColor(brandColor).fontSize(11).font('Helvetica-Bold').text('MANAGEMENT SUMMARY', 65, summaryTop + 15);
        doc.fillColor('#475569').fontSize(10).font('Helvetica').text('The above roadmap encapsulates the prioritized strategic vectors. All phases are synchronized with departmental goals.', 65, summaryTop + 35, { width: 470, lineGap: 4 });
    }
    static async renderAppraisalContent(doc, packet, brandColor) {
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
                if (doc.y > 650)
                    doc.addPage();
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
                            data.competencyScores.forEach((cat) => {
                                if (doc.y > 700)
                                    doc.addPage();
                                const avg = cat.categoryAverage || 0;
                                const scoreLabel = avg >= 4.5 ? 'EXCEPTIONAL' : avg >= 4 ? 'HIGH PROFICIENCY' : avg >= 3 ? 'PROFICIENT' : avg >= 2 ? 'CORE COMPETENCE' : 'DEVELOPMENTAL';
                                doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(cat.category.toUpperCase(), this.SAFE_MARGIN);
                                doc.fontSize(8).font('Helvetica-Bold').fillColor(brandColor).text(scoreLabel, { align: 'right', width: this.CONTENT_WIDTH });
                                doc.moveDown(0.2);
                                doc.rect(this.SAFE_MARGIN, doc.y, this.CONTENT_WIDTH, 0.5).fill('#e2e8f0');
                                doc.moveDown(0.5);
                                cat.competencies.forEach((c) => {
                                    if (doc.y > 720)
                                        doc.addPage();
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
                    }
                    catch (e) { }
                }
                doc.moveDown(3);
            });
        }
        const verdictText = packet.finalVerdict || 'This appraisal has been arbitrated and synchronized with the official personnel dossier.';
        const boxHeight = Math.max(85, doc.heightOfString(verdictText, { width: this.CONTENT_WIDTH - 30, lineGap: 2 }) + 45);
        if (doc.y + boxHeight > 700)
            doc.addPage();
        const sanctionTop = doc.y;
        doc.fillColor('#f8fafc').rect(this.SAFE_MARGIN, sanctionTop, this.CONTENT_WIDTH, boxHeight).fill();
        doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('OFFICIAL ARBITRATION:', this.SAFE_MARGIN + 15, sanctionTop + 15);
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Oblique').text(verdictText, this.SAFE_MARGIN + 15, sanctionTop + 35, { width: this.CONTENT_WIDTH - 30, lineGap: 2 });
        if (sanctionTop + boxHeight + 80 > 750) {
            doc.addPage();
            doc.moveDown(2);
        }
        else {
            doc.y = sanctionTop + boxHeight + 45;
        }
        const sigY = doc.y;
        if (packet.employee?.signatureUrl)
            await this.renderSignature(doc, packet.employee.signatureUrl, 70, sigY, 165);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(235, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('EMPLOYEE SIGN-OFF', 70, sigY + 8);
        const managementSig = packet.finalReviewer?.signatureUrl || packet.reviews?.find((r) => r.reviewStage === 'MANAGER')?.reviewer?.signatureUrl;
        if (managementSig)
            await this.renderSignature(doc, managementSig, 365, sigY, 165);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(365, sigY).lineTo(530, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('AUTHORIZED MANAGEMENT', 365, sigY + 8);
    }
    static async renderSignature(doc, sigUrl, xPos, yPos, lineWidth) {
        try {
            if (!sigUrl)
                return;
            const imgWidth = 110;
            const centeredX = xPos + (lineWidth - imgWidth) / 2;
            if (sigUrl.startsWith('data:image')) {
                const b64 = sigUrl.split(',')[1];
                const img = Buffer.from(b64, 'base64');
                doc.image(img, centeredX, yPos - 35, { width: imgWidth, height: 40, fit: [imgWidth, 40] });
            }
            else {
                // Support for external signature URLs (Cloudinary/Firestore)
                const response = await axios_1.default.get(sigUrl, {
                    responseType: 'arraybuffer',
                    timeout: 5000
                });
                doc.image(response.data, centeredX, yPos - 35, { width: imgWidth, height: 40, fit: [imgWidth, 40] });
            }
        }
        catch (e) {
            console.warn('[PdfExportService] Signature render failed', e);
        }
    }
    static async renderLeaveContent(doc, leave, brandColor) {
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
        const metrics = (0, leave_utils_1.getEffectiveLeaveMetrics)(leave.employee);
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
        if (leave.employee?.signatureUrl)
            await this.renderSignature(doc, leave.employee.signatureUrl, 70, sigY, 160);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(70, sigY).lineTo(230, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text(leave.employee?.fullName?.toUpperCase() || 'EMPLOYEE', 70, sigY + 8);
        const reviewerSig = leave.hrReviewer?.signatureUrl || leave.manager?.signatureUrl;
        if (reviewerSig)
            await this.renderSignature(doc, reviewerSig, 370, sigY, 160);
        doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(370, sigY).lineTo(530, sigY).stroke();
        doc.fontSize(7).fillColor('#64748b').font('Helvetica-Bold').text('MANAGEMENT / HR SIGNATURE', 370, sigY + 8);
    }
    static keyValGrid(doc, x, y, label, value) {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(label.toUpperCase(), x, y);
        doc.fillColor('#1e293b').fontSize(11).font('Helvetica').text(value || 'N/A', x, y + 12);
    }
    static renderPayslipContent(doc, item, brandColor) {
        const currency = item.currency || 'GHS';
        const formatAmount = (val) => val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
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
        const drawRow = (label, value, isDeduction = false) => {
            doc.fillColor(currentY % 44 === 22 ? '#f9fafb' : '#ffffff').rect(50, currentY, 500, 22).fill();
            doc.fillColor('#334155').fontSize(9).font('Helvetica').text(label.toUpperCase(), 65, currentY + 7);
            doc.fillColor(isDeduction ? '#ef4444' : '#1e293b').font('Helvetica-Bold').text(`${isDeduction ? '-' : ''}${formatAmount(value)}`, 450, currentY + 7, { align: 'right', width: 85 });
            currentY += 22;
        };
        drawRow('Basic Salary', Number(item.baseSalary));
        drawRow('Income Tax (PAYE)', Number(item.tax), true);
        drawRow('Net Payout', Number(item.netPay));
        doc.y = currentY + 30;
        const summaryTop = doc.y;
        doc.fillColor('#0f172a').rect(50, summaryTop, 500, 110).fill();
        doc.fillColor(brandColor).fontSize(9).font('Helvetica-Bold').text('NET PAYOUT', 360, summaryTop + 30, { characterSpacing: 2 });
        doc.fillColor('#fff').fontSize(28).font('Helvetica-Bold').text(`${currency} ${formatAmount(Number(item.netPay))}`, 360, summaryTop + 45);
    }
    static renderBoardReportContent(doc, data, brandColor) {
        doc.fillColor('#0f172a').fontSize(24).font('Helvetica-Bold').text('BOARD REPORT', this.SAFE_MARGIN, doc.y);
        doc.moveDown(3);
        doc.fillColor(brandColor).fontSize(14).font('Helvetica-Bold').text('1. Human Capital Snapshot', this.SAFE_MARGIN, doc.y);
        doc.moveTo(this.SAFE_MARGIN, doc.y + 5).lineTo(this.SAFE_MARGIN + this.CONTENT_WIDTH, doc.y + 5).strokeColor(brandColor).lineWidth(2).stroke();
        doc.moveDown(2);
        this.drawMetricCard(doc, 'Total Headcount', String(data.totalEmployees), 50, doc.y, 150, brandColor);
    }
    static drawMetricCard(doc, title, value, x, y, width, color) {
        doc.roundedRect(x, y, width, 60, 8).fillColor('#f8fafc').fill();
        doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text(title.toUpperCase(), x + 10, y + 10, { width: width - 20, align: 'center' });
        doc.fillColor(color).fontSize(18).font('Helvetica-Bold').text(value, x + 10, y + 30, { width: width - 20, align: 'center' });
    }
    static recordMetadata(doc, label, value) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text(`${label.toUpperCase()}: `, this.SAFE_MARGIN, doc.y, { continued: true }).font('Helvetica').fillColor('#1e293b').text(value);
        doc.moveDown(0.2);
    }
}
exports.PdfExportService = PdfExportService;
PdfExportService.SAFE_MARGIN = 50;
PdfExportService.CONTENT_WIDTH = 500;
