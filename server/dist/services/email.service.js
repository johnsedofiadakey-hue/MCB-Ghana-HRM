"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLeaveStatusEmail = exports.sendPayslipEmail = exports.sendWelcomeEmail = exports.sendEmail = exports.sendNotification = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const client_1 = __importDefault(require("../prisma/client"));
// Cache org branding for 5 minutes to avoid repeated DB hits
const brandingCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
async function getOrgBranding(organizationId) {
    const id = organizationId || 'mcb-ghana-tenant';
    const cached = brandingCache.get(id);
    if (cached && cached.expires > Date.now())
        return cached.data;
    try {
        const org = await client_1.default.organization.findUnique({
            where: { id },
            select: { name: true, logoUrl: true, primaryColor: true, email: true, phone: true },
        });
        const branding = {
            name: org?.name || 'MCB-HRM Ghana',
            logoUrl: org?.logoUrl || null,
            primaryColor: org?.primaryColor || '#4f46e5',
            email: org?.email || null,
            phone: org?.phone || null,
        };
        brandingCache.set(id, { data: branding, expires: Date.now() + CACHE_TTL });
        return branding;
    }
    catch {
        return { name: 'MCB-HRM Ghana', primaryColor: '#4f46e5' };
    }
}
function buildBrandedTemplate(branding, title, message, actionUrl, actionLabel = 'View in Dashboard') {
    const color = branding.primaryColor || '#4f46e5';
    const orgName = branding.name;
    const logoHtml = branding.logoUrl
        ? `<img src="${branding.logoUrl}" alt="${orgName}" style="max-height: 40px; margin-bottom: 12px;" />`
        : `<h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">${orgName}</h1>`;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%); padding: 40px 20px; text-align: center; color: white; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: #0f172a; }
        .message { font-size: 16px; color: #475569; margin-bottom: 32px; line-height: 1.8; }
        .button-container { text-align: center; margin-top: 32px; }
        .button { background-color: ${color}; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }
        .footer { padding: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        .footer p { margin: 4px 0; }
        .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          ${logoHtml}
          ${branding.logoUrl ? `<p style="margin: 0; font-size: 13px; opacity: 0.8;">People Operations</p>` : ''}
        </div>
        <div class="content">
          <div class="greeting">${title}</div>
          <div class="message">${message}</div>
          <div class="button-container">
            <a href="${actionUrl}" class="button">${actionLabel}</a>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
          <p>This is an automated notification from your HR platform. Please do not reply directly.</p>
          ${branding.email ? `<p>Contact: ${branding.email}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}
/** Darken/lighten a hex color for gradient effects */
function adjustColor(hex, amount) {
    try {
        const clean = hex.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(clean.substring(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(clean.substring(2, 4), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(clean.substring(4, 6), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    catch {
        return hex;
    }
}
class EmailService {
    /**
     * Send a branded notification email — dynamically branded per tenant.
     */
    static async sendNotification(to, title, message, link, organizationId) {
        const branding = await getOrgBranding(organizationId);
        const dashboardUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
        const actionUrl = link ? (link.startsWith('http') ? link : `${dashboardUrl}${link}`) : dashboardUrl;
        const html = buildBrandedTemplate(branding, title, message, actionUrl);
        try {
            const fromName = `"${branding.name}" <${process.env.SMTP_USER || 'notifications@mcb-ghana-hrm.com'}>`;
            const info = await this.transporter.sendMail({
                from: fromName,
                to,
                subject: `[${branding.name}] ${title}`,
                html,
            });
            console.log(`[EmailService] Sent to ${to}: ${info.messageId}`);
            return info;
        }
        catch (error) {
            console.error('[EmailService] Failed to send email:', error);
            return null;
        }
    }
    static async sendEmail(params) {
        try {
            return await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || '"MCB-HRM Ghana" <notifications@mcb-ghana-hrm.com>',
                ...params,
            });
        }
        catch (error) {
            console.error('[EmailService] sendEmail error:', error);
            return null;
        }
    }
    static async sendWelcomeEmail(to, name, pass, company, organizationId) {
        const branding = await getOrgBranding(organizationId);
        const dashboardUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
        const message = `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account at <strong>${company}</strong> has been created. You can log in with:</p>
      <div style="background: #f1f5f9; padding: 16px 20px; border-radius: 12px; margin: 16px 0; font-family: monospace;">
        <p style="margin: 4px 0;"><strong>Email:</strong> ${to}</p>
        <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${pass}</p>
      </div>
      <p>Please change your password after your first login.</p>
    `;
        const html = buildBrandedTemplate(branding, `Welcome to ${company}`, message, dashboardUrl, 'Login Now');
        return this.sendEmail({ to, subject: `Welcome to ${company} — Your Account is Ready`, html });
    }
    static async sendPayslipEmail(to, period, employeeName, organizationId) {
        const branding = await getOrgBranding(organizationId);
        const dashboardUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
        const message = `
      <p>Hi${employeeName ? ` <strong>${employeeName}</strong>` : ''},</p>
      <p>Your payslip for <strong>${period}</strong> has been processed and is now available for download.</p>
      <p>You can view and download your payslip from the Payroll section of your dashboard.</p>
    `;
        const html = buildBrandedTemplate(branding, `Payslip Ready — ${period}`, message, `${dashboardUrl}/payroll`, 'View Payslip');
        return this.sendEmail({ to, subject: `[${branding.name}] Your Payslip for ${period}`, html });
    }
    static async sendLeaveStatusEmail(to, employeeName, status, dates, organizationId) {
        const branding = await getOrgBranding(organizationId);
        const dashboardUrl = process.env.FRONTEND_URL || 'https://mcb-hrm-ghana.web.app';
        const isApproved = status === 'APPROVED';
        const message = `
      <p>Hi <strong>${employeeName}</strong>,</p>
      <p>Your leave request for <strong>${dates}</strong> has been <strong style="color: ${isApproved ? '#16a34a' : '#dc2626'};">${status.toLowerCase()}</strong>.</p>
      ${isApproved ? '<p>Please ensure your handover is complete before your leave period begins.</p>' : '<p>Please contact your manager or HR for more details.</p>'}
    `;
        const html = buildBrandedTemplate(branding, `Leave Request ${status}`, message, `${dashboardUrl}/leave`, 'View Leave Status');
        return this.sendEmail({ to, subject: `[${branding.name}] Leave Request ${status}`, html });
    }
}
exports.EmailService = EmailService;
EmailService.transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
exports.sendNotification = EmailService.sendNotification.bind(EmailService);
exports.sendEmail = EmailService.sendEmail.bind(EmailService);
exports.sendWelcomeEmail = EmailService.sendWelcomeEmail.bind(EmailService);
exports.sendPayslipEmail = EmailService.sendPayslipEmail.bind(EmailService);
exports.sendLeaveStatusEmail = EmailService.sendLeaveStatusEmail.bind(EmailService);
