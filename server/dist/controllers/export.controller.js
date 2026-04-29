"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportRoadmapPdf = exports.exportLeavePdf = exports.exportAppraisalPdf = exports.exportTargetPdf = void 0;
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
