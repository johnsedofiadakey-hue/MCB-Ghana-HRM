"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportEmployeesPdf = exports.exportEmployeePdf = exports.exportRoadmapPdf = exports.exportLeavePdf = exports.exportAppraisalPdf = exports.exportTargetPdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const client_1 = __importDefault(require("../prisma/client"));
const pdf_service_1 = require("../services/pdf.service");
const error_log_service_1 = require("../services/error-log.service");
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const exportTargetPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const target = await client_1.default.target.findUnique({
            where: { id, organizationId: orgId },
            include: {
                metrics: true,
                assignee: { select: { fullName: true } },
                department: { select: { name: true } },
                originator: { select: { fullName: true } },
                lineManager: { select: { fullName: true } },
                reviewer: { select: { fullName: true } },
                updates: {
                    include: { submittedBy: { select: { fullName: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
        if (!target)
            return res.status(404).json({ error: 'Target not found' });
        const pdfBuffer = await pdf_service_1.PdfExportService.generateBrandedPdf(orgId, `Target Achievement Certificate: ${target.title}`, target, 'TARGET');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Target_${id}.pdf`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        error_log_service_1.errorLogger.log('ExportController.exportTargetPdf', err);
        return res.status(500).json({ error: 'Failed to generate target PDF' });
    }
};
exports.exportTargetPdf = exportTargetPdf;
const exportAppraisalPdf = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const packet = await client_1.default.appraisalPacket.findUnique({
            where: { id, organizationId: orgId },
            include: {
                employee: {
                    select: {
                        fullName: true,
                        jobTitle: true,
                        employeeCode: true,
                        departmentObj: { select: { name: true } }
                    }
                },
                cycle: { select: { title: true } },
                reviews: {
                    include: { reviewer: { select: { fullName: true } } },
                    orderBy: { submittedAt: 'asc' }
                },
                resolvedBy: { select: { fullName: true } }
            }
        });
        if (!packet)
            return res.status(404).json({ error: 'Appraisal packet not found' });
        const pdfBuffer = await pdf_service_1.PdfExportService.generateBrandedPdf(orgId, `Performance Appraisal: ${packet.employee?.fullName}`, packet, 'APPRAISAL');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Appraisal_${id}.pdf`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        error_log_service_1.errorLogger.log('ExportController.exportAppraisalPdf', err);
        return res.status(500).json({ error: 'Failed to generate appraisal PDF' });
    }
};
exports.exportAppraisalPdf = exportAppraisalPdf;
const exportLeavePdf = async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = getOrgId(req);
        const leave = await client_1.default.leaveRequest.findUnique({
            where: { id, organizationId: orgId },
            include: {
                employee: {
                    include: { departmentObj: { select: { name: true } } }
                },
                reliever: { select: { fullName: true } },
                manager: { select: { fullName: true } },
                hrReviewer: { select: { fullName: true } },
                handoverRecords: {
                    include: { reliever: { select: { fullName: true } } }
                }
            }
        });
        if (!leave)
            return res.status(404).json({ error: 'Leave request not found' });
        const pdfBuffer = await pdf_service_1.PdfExportService.generateBrandedPdf(orgId, `Leave Authorization Certificate`, leave, 'LEAVE');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Leave_${id}.pdf`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        error_log_service_1.errorLogger.log('ExportController.exportLeavePdf', err);
        return res.status(500).json({ error: 'Failed to generate leave PDF' });
    }
};
exports.exportLeavePdf = exportLeavePdf;
const exportRoadmapPdf = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const userRole = req.user.role;
        const userRank = req.user.rank || 0;
        // Fetch all targets where user is assignee OR team targets if manager+
        const targets = await client_1.default.target.findMany({
            where: {
                organizationId: orgId,
                OR: [
                    { assigneeId: userId },
                    ...(userRank >= 60 ? [{ originatorId: userId }] : []),
                    ...(userRank >= 80 ? [{ level: 'DEPARTMENT' }] : [])
                ],
                isArchived: false
            },
            include: {
                metrics: true,
                assignee: { select: { fullName: true } },
                department: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        if (targets.length === 0) {
            return res.status(404).json({ error: 'No active targets identified for roadmap generation.' });
        }
        const pdfBuffer = await pdf_service_1.PdfExportService.generateBrandedPdf(orgId, `Strategic Performance Roadmap: ${req.user.name}`, targets, 'TARGET_ROADMAP');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Roadmap_${userId}.pdf`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        error_log_service_1.errorLogger.log('ExportController.exportRoadmapPdf', err);
        return res.status(500).json({ error: 'Failed to generate roadmap PDF' });
    }
};
exports.exportRoadmapPdf = exportRoadmapPdf;
const exportEmployeePdf = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { id } = req.params;
        const employee = await client_1.default.user.findFirst({
            where: { id, organizationId: orgId },
            include: {
                departmentObj: true,
                subUnit: true,
                supervisor: { select: { fullName: true, email: true } },
            }
        });
        if (!employee)
            return res.status(404).json({ error: 'Employee not found' });
        const org = await client_1.default.organization.findUnique({
            where: { id: orgId },
            select: { name: true, address: true, phone: true, email: true, city: true, country: true, primaryColor: true }
        });
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => {
            const pdf = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Employee_${employee.employeeCode || employee.id}.pdf`);
            res.send(pdf);
        });
        const primary = org?.primaryColor || '#4F46E5';
        doc.fillColor(primary).fontSize(20).font('Helvetica-Bold').text(org?.name || 'MCB HRM Ghana', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#111827').fontSize(16).text('Employee Dossier', { align: 'center' });
        doc.moveDown(2);
        const row = (label, value) => {
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text(label, { continued: true, width: 160 });
            doc.font('Helvetica').fillColor('#111827').text(String(value ?? 'N/A'));
            doc.moveDown(0.6);
        };
        row('Full Name: ', employee.fullName);
        row('Employee Code: ', employee.employeeCode);
        row('Email: ', employee.email);
        row('Role: ', employee.role);
        row('Job Title: ', employee.jobTitle);
        row('Status: ', employee.status);
        row('Department: ', employee.departmentObj?.name);
        row('Sub Unit: ', employee.subUnit?.name);
        row('Supervisor: ', employee.supervisor?.fullName);
        row('Employment Type: ', employee.employmentType);
        row('Join Date: ', employee.joinDate ? employee.joinDate.toISOString().slice(0, 10) : null);
        row('Phone: ', employee.contactNumber);
        row('Address: ', employee.address);
        row('Nationality: ', employee.nationality || employee.countryOfOrigin);
        doc.moveDown(2);
        doc.fontSize(8).fillColor('#6B7280').text(`Generated ${new Date().toISOString()} by ${req.user?.name || 'MCB HRM Ghana'}`, { align: 'center' });
        doc.end();
    }
    catch (err) {
        error_log_service_1.errorLogger.log('ExportController.exportEmployeePdf', err);
        return res.status(500).json({ error: 'Failed to generate employee dossier PDF' });
    }
};
exports.exportEmployeePdf = exportEmployeePdf;
const exportEmployeesPdf = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const employees = await client_1.default.user.findMany({
            where: { organizationId: orgId, isArchived: false },
            include: { departmentObj: true },
            orderBy: { fullName: 'asc' }
        });
        const org = await client_1.default.organization.findUnique({
            where: { id: orgId },
            select: { name: true, primaryColor: true }
        });
        const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => {
            const pdf = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=employees_export.pdf');
            res.send(pdf);
        });
        const primary = org?.primaryColor || '#4F46E5';
        doc.fillColor(primary).fontSize(18).font('Helvetica-Bold').text(org?.name || 'MCB HRM Ghana', { align: 'center' });
        doc.moveDown(0.4);
        doc.fillColor('#111827').fontSize(14).text('Employee Register', { align: 'center' });
        doc.moveDown(1.5);
        employees.forEach((employee, index) => {
            if (doc.y > 740)
                doc.addPage();
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827')
                .text(`${index + 1}. ${employee.fullName}`);
            doc.font('Helvetica').fontSize(8).fillColor('#4B5563')
                .text(`${employee.employeeCode || 'No code'} | ${employee.email} | ${employee.role} | ${employee.departmentObj?.name || 'No department'} | ${employee.status}`);
            doc.moveDown(0.6);
        });
        doc.end();
    }
    catch (err) {
        error_log_service_1.errorLogger.log('ExportController.exportEmployeesPdf', err);
        return res.status(500).json({ error: 'Failed to generate employee register PDF' });
    }
};
exports.exportEmployeesPdf = exportEmployeesPdf;
