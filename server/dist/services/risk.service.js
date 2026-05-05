"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskProfile = exports.calculateAttritionRisk = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const calculateAttritionRisk = async (organizationId, employeeId) => {
    const employee = await client_1.default.user.findUnique({
        where: { id: employeeId, organizationId },
        include: {
            appraisalPackets: {
                orderBy: { createdAt: 'desc' },
                take: 2
            },
            leaves: {
                where: { status: 'APPROVED' },
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    });
    if (!employee)
        throw new Error('Employee not found');
    let score = 20; // Baseline
    const factors = [];
    // Factor 1: Salary stagnation
    const joinedYear = employee.createdAt.getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsInCompany = currentYear - joinedYear;
    // We assume 1 year since last raise is risky if not tracked.
    // For now we check if salary is present.
    if (!employee.salary) {
        score += 10;
        factors.push('Missing salary structure');
    }
    // Factor 2: Appraisal Performance
    const recentAppraisals = employee.appraisalPackets;
    if (recentAppraisals && recentAppraisals.length > 0) {
        const avgScore = recentAppraisals.reduce((sum, a) => sum + (Number(a.finalScore) || 0), 0) / recentAppraisals.length;
        if (avgScore > 4) {
            // High performers are higher flight risks if stagnating
            score += 15;
            factors.push('High performance talent saturation');
        }
        else if (avgScore < 2) {
            score += 20;
            factors.push('Poor performance engagement');
        }
    }
    // Factor 3: Leave Patterns (Burnout)
    const recentLeave = employee.leaves;
    if (recentLeave.length === 0 && yearsInCompany > 0.5) {
        score += 15;
        factors.push('Lack of restorative leave (Burnout risk)');
    }
    else if (recentLeave.length > 5) {
        score += 10;
        factors.push('High frequency of leave requests');
    }
    // Normalized cap
    score = Math.min(100, Math.max(0, score));
    let level = 'LOW';
    if (score > 80)
        level = 'CRITICAL';
    else if (score > 60)
        level = 'HIGH';
    else if (score > 40)
        level = 'MEDIUM';
    return { score, level, factors };
};
exports.calculateAttritionRisk = calculateAttritionRisk;
const getRiskProfile = async (organizationId, employeeId) => {
    const attrition = await (0, exports.calculateAttritionRisk)(organizationId, employeeId);
    return {
        overallRisk: attrition.level,
        attritionScore: attrition.score,
        factors: attrition.factors,
        recommendation: attrition.score > 60
            ? 'Immediate intervention recommended: Conduct a 1-on-1 retention interview.'
            : 'Maintain current engagement levels.',
        updatedAt: new Date()
    };
};
exports.getRiskProfile = getRiskProfile;
