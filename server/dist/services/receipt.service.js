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
exports.ReceiptService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const date_fns_1 = require("date-fns");
const client_1 = __importDefault(require("../prisma/client"));
const i18n_service_1 = require("./i18n.service");
class ReceiptService {
    static async generateSubscriptionReceipt(subscriptionId, organizationId, res) {
        const [org, sub] = await Promise.all([
            client_1.default.organization.findUnique({
                where: { id: organizationId },
                select: {
                    name: true, logoUrl: true, address: true, phone: true, email: true, language: true,
                    primaryColor: true, textPrimary: true
                }
            }),
            client_1.default.subscription.findUnique({
                where: { id: subscriptionId, organizationId },
                include: { client: { include: { organization: true } } }
            })
        ]);
        if (!sub) {
            throw new Error('Subscription records not found for receipt generation.');
        }
        const lang = org?.language || 'en';
        const companyName = org?.name || 'MC-BAUCHEMIE GHANA';
        const t = (key) => i18n_service_1.i18n.translate(key, lang);
        const doc = new pdfkit_1.default({
            margin: 50,
            size: 'A4',
            info: {
                Title: `Receipt - ${sub.id}`,
                Author: companyName
            }
        });
        // Stream the PDF to the response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=receipt-${sub.id.split('-')[0]}.pdf`);
        doc.pipe(res);
        // Sidebar Accent (Dynamic Branding)
        const primaryColor = org?.primaryColor || '#8b5cf6';
        doc.rect(0, 0, 15, 842).fill(primaryColor);
        // Header / Branding
        const textPrimary = org?.textPrimary || '#111827';
        if (org?.logoUrl) {
            try {
                let logoSource = null;
                if (org.logoUrl.startsWith('data:image')) {
                    const b64 = org.logoUrl.split(',')[1];
                    if (b64)
                        logoSource = Buffer.from(b64, 'base64');
                }
                else if (org.logoUrl.startsWith('http')) {
                    try {
                        const axios = (await Promise.resolve().then(() => __importStar(require('axios')))).default;
                        const response = await axios.get(org.logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
                        logoSource = Buffer.from(response.data);
                    }
                    catch (fetchError) {
                        console.error('[ReceiptService] Remote logo fetch failed:', fetchError);
                    }
                }
                else {
                    // Handle Local Fallback
                    const publicPath = path_1.default.join(process.cwd(), 'server/public', org.logoUrl);
                    const uploadsPath = path_1.default.join(process.cwd(), 'server', org.logoUrl);
                    if (fs_1.default.existsSync(publicPath))
                        logoSource = publicPath;
                    else if (fs_1.default.existsSync(uploadsPath))
                        logoSource = uploadsPath;
                }
                if (logoSource) {
                    doc.image(logoSource, 50, 45, { height: 35 });
                    doc.fillColor(textPrimary).font('Helvetica-Bold').fontSize(18).text(companyName.toUpperCase(), 100, 52);
                }
                else {
                    doc.fillColor(textPrimary).font('Helvetica-Bold').fontSize(24).text(companyName.toUpperCase(), 50, 50);
                }
            }
            catch (e) {
                doc.fillColor(textPrimary).font('Helvetica-Bold').fontSize(24).text(companyName.toUpperCase(), 50, 50);
            }
        }
        else {
            doc.fillColor(textPrimary).font('Helvetica-Bold').fontSize(24).text(companyName.toUpperCase(), 50, 50);
        }
        doc.fontSize(10).font('Helvetica').fillColor('#6B7280').text(org?.address || 'Premium Workforce Management Systems', 50, 80);
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(t('pdf.receipt.title'), 350, 50, { align: 'right' });
        doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text(`${t('pdf.receipt.date')}: ${(0, date_fns_1.format)(new Date(sub.createdAt), 'MMMM dd, yyyy')}`, 350, 65, { align: 'right' });
        doc.text(`${t('pdf.receipt.receipt_id')}: #${sub.id.split('-')[0].toUpperCase()}`, 350, 80, { align: 'right' });
        // Dividers
        doc.moveTo(50, 110).lineTo(550, 110).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
        // Bill To Section
        doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica-Bold').text(t('pdf.receipt.issued_to'), 50, 130);
        doc.fillColor('#111827').fontSize(12).text(sub.client.organization?.name || companyName, 50, 145);
        doc.fontSize(10).font('Helvetica').text(sub.client.fullName || '', 50, 160);
        doc.text(sub.client.email || '', 50, 175);
        // Payment Logic Summary
        doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica-Bold').text(t('pdf.receipt.payment_details'), 350, 130);
        doc.fillColor('#111827').fontSize(10).font('Helvetica').text(`${t('pdf.receipt.method')}: ${t('pdf.receipt.method_value')}`, 350, 145);
        doc.text(`${t('pdf.receipt.status')}: ${t('pdf.receipt.status_value')}`, 350, 160);
        doc.fillColor('#10B981').text(t('pdf.receipt.activation'), 350, 175);
        // Table Header
        const tableTop = 230;
        doc.rect(50, tableTop, 500, 25).fill('#F9FAFB');
        doc.fillColor('#374151').fontSize(9).font('Helvetica-Bold').text(t('pdf.receipt.description'), 60, tableTop + 8);
        doc.text(t('pdf.receipt.qty'), 300, tableTop + 8);
        doc.text(t('pdf.receipt.unit_price'), 380, tableTop + 8, { align: 'right' });
        doc.text(t('pdf.receipt.total'), 480, tableTop + 8, { align: 'right' });
        // Table Row
        const rowTop = tableTop + 40;
        doc.fillColor('#111827').font('Helvetica').fontSize(10);
        doc.text(`${companyName} Enterprise - ${sub.plan === 'ANNUALLY' ? 'Annual' : 'Monthly'} Subscription`, 60, rowTop);
        doc.text('1', 300, rowTop);
        // Use fixed 3500 for Annual if not specified
        const displayCurrency = 'USD';
        const displayPrice = sub.plan === 'ANNUALLY' ? 3500 : (sub.price || 450);
        doc.text(`${displayCurrency} ${displayPrice.toLocaleString()}`, 380, rowTop, { align: 'right' });
        doc.font('Helvetica-Bold').text(`${displayCurrency} ${displayPrice.toLocaleString()}`, 480, rowTop, { align: 'right' });
        // Subtotal Area
        const summaryTop = rowTop + 60;
        doc.moveTo(350, summaryTop).lineTo(550, summaryTop).strokeColor('#E5E7EB').stroke();
        doc.fillColor('#6B7280').font('Helvetica').fontSize(10).text(`${t('pdf.receipt.subtotal')}:`, 350, summaryTop + 15);
        doc.fillColor('#111827').text(`${displayCurrency} ${displayPrice.toLocaleString()}`, 480, summaryTop + 15, { align: 'right' });
        doc.fillColor('#6B7280').text(`${t('pdf.receipt.tax')}:`, 350, summaryTop + 35);
        doc.fillColor('#111827').text(`${displayCurrency} 0.00`, 480, summaryTop + 35, { align: 'right' });
        doc.rect(350, summaryTop + 55, 200, 40).fill('#F3F4F6');
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text(t('pdf.receipt.total_paid'), 360, summaryTop + 70);
        doc.fontSize(14).text(`${displayCurrency} ${displayPrice.toLocaleString()}`, 450, summaryTop + 68, { align: 'right' });
        // Notes
        doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica-Bold').text(t('pdf.receipt.notes_title'), 50, 500);
        doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text(t('pdf.receipt.notes_value'), 50, 515, { width: 250 });
        // Footer
        doc.fontSize(8).fillColor('#D1D5DB').text(`${t('pdf.receipt.footer_line1')} • Accra, GH`, 50, 750, { align: 'center' });
        doc.text(t('pdf.receipt.footer_line2'), 50, 765, { align: 'center' });
        doc.end();
    }
}
exports.ReceiptService = ReceiptService;
