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
exports.createEmployeeWithNotifications = exports.resetEmployeePassword = exports.getUserRiskProfile = exports.promoteEmployee = exports.transferEmployee = exports.restoreEmployee = exports.archiveEmployee = exports.getSupervisors = exports.uploadSignature = exports.uploadImage = exports.assignRole = exports.hardDeleteEmployee = exports.deleteEmployee = exports.updateEmployee = exports.getEmployee = exports.getAllEmployees = exports.createEmployee = exports.getMyTeam = void 0;
const auth_middleware_1 = require("../middleware/auth.middleware");
const client_1 = __importDefault(require("../prisma/client"));
const leave_utils_1 = require("../utils/leave.utils");
const userService = __importStar(require("../services/user.service"));
const riskService = __importStar(require("../services/risk.service"));
const audit_service_1 = require("../services/audit.service");
const websocket_service_1 = require("../services/websocket.service");
const email_service_1 = require("../services/email.service");
const hierarchy_service_1 = require("../services/hierarchy.service");
/**
 * 🚀 HARDENED PROD URL DETECTION
 * Returns the most accurate public base URL for imagery.
 */
const getPublicBaseUrl = (req) => {
    // 1. Manual Overrule (Highest priority)
    if (process.env.API_BASE_URL && !process.env.API_BASE_URL.includes('localhost')) {
        return process.env.API_BASE_URL.replace(/\/$/, '');
    }
    // 2. Render Direct Environment Context
    if (process.env.RENDER_EXTERNAL_URL) {
        return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
    }
    // 3. Proxy Protocol & Host detection
    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const protocol = forwardedProto || req.protocol || 'https';
    let host = forwardedHost || req.get('host') || '';
    // 4. DEFENSIVE FAIL-SAFE: If we are on Render but host is missing or localhost
    const isOnRender = !!process.env.RENDER_SERVICE_ID;
    if (isOnRender && (host.includes('localhost') || !host)) {
        // Force the known production API domain
        return 'https://mcb-hrm-ghana-api.onrender.com';
    }
    // Fallback for local dev
    if (!host)
        host = 'localhost:5000';
    return `${protocol}://${host}`;
};
const encryption_1 = require("../utils/encryption");
// ─── Field filter by role ─────────────────────────────────────────────────
const getSafeUser = (user, requestorRole) => {
    const { passwordHash, ...safe } = user;
    const userRank = (0, auth_middleware_1.getRoleRank)(requestorRole);
    // 🔄 Leave Allowance Inheritance: Prioritize user-specific allowance, then organization default, then system default.
    // We use the centralized utility to ensure consistency across the platform.
    const metrics = (0, leave_utils_1.getEffectiveLeaveMetrics)(user);
    safe.leaveAllowance = metrics.allowance;
    safe.leaveBalance = metrics.balance;
    // Decrypt sensitive fields if authorized (HR/MD (>= 85))
    // 🛡️ REFINEMENT: Always try to decrypt if the Enc field exists, to ensure fresh plain text for the frontend.
    if (userRank >= 85) {
        if (safe.bankAccountEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.bankAccountEnc);
            if (dec)
                safe.bankAccountNumber = dec;
        }
        if (safe.ghanaCardEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.ghanaCardEnc);
            if (dec)
                safe.nationalId = dec;
        }
        if (safe.ssnitEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.ssnitEnc);
            if (dec)
                safe.ssnitNumber = dec;
        }
        if (safe.salaryEnc) {
            const dec = (0, encryption_1.decryptValue)(safe.salaryEnc);
            if (dec)
                safe.salary = parseFloat(dec);
        }
    }
    // Parse certifications if stringified JSON
    if (typeof safe.certifications === 'string' && safe.certifications.startsWith('[')) {
        try {
            safe.certifications = JSON.parse(safe.certifications);
        }
        catch (e) {
            safe.certifications = [];
        }
    }
    if (userRank < 85) {
        delete safe.salary;
        delete safe.currency;
        delete safe.bankAccountEnc;
        delete safe.ghanaCardEnc;
        delete safe.ssnitEnc;
        delete safe.salaryEnc;
    }
    return safe;
};
const withDepartment = (u) => {
    return { ...u, department: u.departmentObj?.name };
};
// ─── GET MY TEAM ──────────────────────────────────────────────────────────
const getMyTeam = async (req, res) => {
    try {
        const userReq = req.user;
        const isDev = userReq.role === 'DEV';
        const organizationId = isDev ? undefined : (userReq.organizationId || 'mcb-ghana-tenant');
        const whereOrg = organizationId ? { organizationId } : {};
        const { id: userId, role } = userReq;
        const requestedId = req.query.supervisorId;
        let supervisorId = userId;
        if ((0, auth_middleware_1.getRoleRank)(role) >= 80 && requestedId)
            supervisorId = requestedId;
        const take = parseInt(req.query.take) || 50;
        const skip = parseInt(req.query.skip) || 0;
        const search = req.query.search;
        const where = { supervisorId, ...whereOrg };
        if (search) {
            where.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { jobTitle: { contains: search, mode: 'insensitive' } }
            ];
        }
        const team = await client_1.default.user.findMany({
            where,
            orderBy: { fullName: 'asc' },
            take, skip,
            include: {
                kpiSheets: {
                    where: whereOrg,
                    orderBy: { createdAt: 'desc' }, take: 1,
                    select: { id: true, totalScore: true, status: true, isLocked: true }
                }
            }
        });
        return res.json(team.map(emp => ({
            id: emp.id,
            name: emp.fullName,
            fullName: emp.fullName, // For consistency with TargetCascadeModal
            role: emp.jobTitle,
            jobTitle: emp.jobTitle, // For consistency with TargetCascadeModal
            email: emp.email,
            avatar: emp.avatarUrl,
            avatarUrl: emp.avatarUrl,
            status: emp.status,
            kpiSheets: emp.kpiSheets,
            lastSheetId: emp.kpiSheets[0]?.id,
            lastScore: Number(emp.kpiSheets[0]?.totalScore || 0),
            performance: Number(emp.kpiSheets[0]?.totalScore || 0) > 80 ? 'On Track' : 'Needs Attention'
        })));
    }
    catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.getMyTeam = getMyTeam;
// ─── CREATE EMPLOYEE ──────────────────────────────────────────────────────
const createEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const actorRank = userReq.rank;
        const actorRole = userReq.role;
        const actorId = userReq.id;
        // Only HR/MD (>= 85) can set salary/currency on create
        // GLOBAL CONTROLLER ACCESS: HR/IT Managers (Rank 85+) can create all roles.
        const targetRank = (0, auth_middleware_1.getRoleRank)(req.body.role);
        if (actorRank < 85) {
            delete req.body.salary;
            delete req.body.currency;
        }
        if (actorRank < 85 && targetRank >= 85 && actorRole !== 'DEV') {
            return res.status(403).json({ error: 'Access denied: Only managers can create administrative accounts.' });
        }
        const tempPassword = req.body.password || 'SecureInit!';
        // 🛡️ Validate SubUnit/Department pairing
        if (req.body.subUnitId && req.body.departmentId) {
            const subUnit = await client_1.default.subUnit.findUnique({ where: { id: req.body.subUnitId } });
            if (subUnit && subUnit.departmentId !== Number(req.body.departmentId)) {
                return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
            }
        }
        const user = await userService.createUser(organizationId, req.body);
        const { passwordHash, ...safeUser } = user;
        // Fire-and-forget welcome email
        const org = await client_1.default.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
        (0, email_service_1.sendWelcomeEmail)(user.email, user.fullName, tempPassword, org?.name || 'HRM Engine').catch(console.error);
        // 🚀 AUTO-ONBOARDING: Attach default template if exists
        try {
            const defaultTemplate = await client_1.default.onboardingTemplate.findFirst({
                where: { organizationId, isDefault: true },
                include: { tasks: { orderBy: { order: 'asc' } } }
            });
            if (defaultTemplate && defaultTemplate.tasks.length > 0) {
                await client_1.default.onboardingSession.create({
                    data: {
                        employeeId: user.id,
                        organizationId,
                        templateId: defaultTemplate.id,
                        progress: 0,
                        items: {
                            create: defaultTemplate.tasks.map(task => ({
                                taskId: task.id,
                                organizationId,
                                title: task.title,
                                category: task.category,
                                isRequired: task.isRequired,
                                dueDate: new Date(Date.now() + task.dueAfterDays * 24 * 60 * 60 * 1000)
                            }))
                        }
                    }
                });
            }
        }
        catch (onboardErr) {
            console.error('[Onboarding Trigger Error]:', onboardErr);
        }
        res.status(201).json(withDepartment(getSafeUser(safeUser, actorRole)));
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
exports.createEmployee = createEmployee;
// ─── GET ALL EMPLOYEES (Hardened for Managers) ───────────────────────────
const getAllEmployees = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const filters = { organizationId };
        const showArchived = req.query.archived === 'true';
        if (showArchived) {
            filters.isArchived = true;
        }
        else {
            filters.isArchived = false;
        }
        if (req.query.department)
            filters.departmentId = parseInt(req.query.department);
        if (req.query.role)
            filters.role = req.query.role;
        if (req.query.status)
            filters.status = req.query.status;
        const search = req.query.search;
        if (search) {
            filters.OR = [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { employeeCode: { contains: search, mode: 'insensitive' } },
                { jobTitle: { contains: search, mode: 'insensitive' } }
            ];
        }
        const userRole = userReq.role;
        const userRank = (0, auth_middleware_1.getRoleRank)(userRole);
        const userId = userReq.id;
        // 🛡️ DEV ISOLATION: Always exclude DEV role from staff lists
        // Only users with Rank 100 (DEV) can see other DEVs.
        const isDevRequestor = userRole === 'DEV' || userRank === 100;
        if (isDevRequestor) {
            if (req.query.role)
                filters.role = req.query.role;
        }
        else {
            // Non-devs can never see DEV accounts
            filters.role = { not: 'DEV' };
            filters.rank = { lt: 100 };
        }
        console.log(`[User Ledger] Fetching with filters:`, JSON.stringify(filters));
        // 🛡️ DEPARTMENTAL & HIERARCHY ISOLATION: 
        // - MD/Director/HR/IT (>= 80) can see all.
        // - Managers/Supervisors (< 80) see their department PLUS their reporting chain.
        if (userRank < 80 && userRole !== 'DEV') {
            const managedIds = await hierarchy_service_1.HierarchyService.getManagedEmployeeIds(userId, organizationId);
            filters.OR = [
                { departmentId: userReq.departmentId },
                { id: { in: managedIds } }
            ];
        }
        const take = parseInt(req.query.take) || 100;
        const skip = parseInt(req.query.skip) || 0;
        const sortBy = req.query.sortBy || 'fullName';
        const sortOrder = sortBy === 'createdAt' ? 'desc' : 'asc';
        const users = await client_1.default.user.findMany({
            where: filters,
            take,
            skip,
            orderBy: { [sortBy]: sortOrder },
            include: {
                departmentObj: { select: { name: true } },
                organization: { select: { defaultLeaveAllowance: true } },
                leaves: {
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    },
                    take: 1
                }
            }
        });
        res.json(users.map(u => {
            const safe = getSafeUser(u, userRole);
            return {
                ...withDepartment(safe),
                isOnLeave: u.leaves.length > 0
            };
        }));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getAllEmployees = getAllEmployees;
// ─── GET SINGLE EMPLOYEE (Hardened) ──────────────────────────────────────
const getEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const targetId = req.params.id;
        const user = await userService.getUserById(organizationId, targetId);
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        const userRole = userReq.role;
        const userRank = (0, auth_middleware_1.getRoleRank)(userRole);
        const actorId = userReq.id;
        // 🛡️ ACCESS CONTROL: 
        // - MD/HR/Director (>= 80) can view all.
        // - Manager/Staff (< 80) can only view their department, themselves, or their subordinates.
        if (userRank < 80 && userRole !== 'DEV' && actorId !== targetId) {
            if (user.departmentId !== userReq.departmentId) {
                const isSub = await hierarchy_service_1.HierarchyService.isSubordinate(actorId, targetId, organizationId);
                if (!isSub) {
                    return res.status(403).json({ message: 'Access denied: You can only view employees in your department or reporting chain.' });
                }
            }
        }
        res.json(withDepartment(getSafeUser(user, userRole)));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getEmployee = getEmployee;
// ─── UPDATE EMPLOYEE (Hardened) ──────────────────────────────────────────
const updateEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const rank = (0, auth_middleware_1.getRoleRank)(userReq.role);
        const privilegedRoles = ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
        const actorId = userReq.id;
        const actorRole = userReq.role;
        const actorRank = (0, auth_middleware_1.getRoleRank)(actorRole);
        const targetId = req.params.id;
        // 🛡️ REQUISITE: Only MD, HR, or IT can update employee details
        // 🔄 SELF-SERVICE OVERRIDE: Allow any user to update their own contact/bank details
        const isSelfUpdate = actorId === targetId;
        const allowedSelfFields = [
            'contactNumber', 'bankName', 'bankAccountNumber', 'bankBranch',
            'address', 'nextOfKinName', 'nextOfKinRelation', 'nextOfKinContact',
            'emergencyContactName', 'emergencyContactPhone', 'gender', 'maritalStatus', 'bloodGroup'
        ];
        if (!privilegedRoles.includes(actorRole) && actorRank < 70) {
            if (!isSelfUpdate) {
                return res.status(403).json({ error: 'Access denied: Only Managers, HR, or IT can update personnel profiles.' });
            }
            // Filter body to only allowed self-service fields
            const filteredBody = {};
            let hasForbiddenFields = false;
            Object.keys(req.body).forEach(field => {
                if (allowedSelfFields.includes(field)) {
                    filteredBody[field] = req.body[field];
                }
                else {
                    hasForbiddenFields = true;
                }
            });
            if (Object.keys(filteredBody).length === 0) {
                return res.status(400).json({ error: 'No permitted fields provided for self-service update.' });
            }
            // Replace body with filtered version to prevent unauthorized field injection
            req.body = filteredBody;
        }
        // Fetch target to check hierarchy
        const targetUser = await client_1.default.user.findUnique({ where: { id: targetId, organizationId } });
        if (!targetUser)
            return res.status(404).json({ message: 'User not found' });
        // 🛡️ ACCESS CONTROL: 
        // - MD/HR/Director (>= 80) can manage all.
        // - Manager (< 80 and >= 70) can manage their department reports.
        // - Staff (< 70) cannot manage others.
        if (actorRank < 80 && actorRole !== 'DEV' && actorId !== targetId) {
            if (targetUser.departmentId !== userReq.departmentId) {
                return res.status(403).json({ message: 'Access denied: You can only manage employees in your department.' });
            }
            // Staff cannot manage others at all
            if (actorRank < 70) {
                return res.status(403).json({ message: 'Access denied: Only managers can update employee records.' });
            }
            // Cannot edit someone with equal or higher rank
            if ((0, auth_middleware_1.getRoleRank)(targetUser.role) >= actorRank) {
                return res.status(403).json({ message: 'Access denied: You cannot manage users with equal or higher rank.' });
            }
        }
        // Only HR/MD (>= 85) can change salary/currency
        if (actorRank < 85) {
            delete req.body.salary;
            delete req.body.currency;
        }
        // 🛡️ GLOBAL CONTROLLER ACCESS (IT/HR Managers >= 85)
        // They are fully responsible for the app and can manage all roles including HR_MANAGER.
        // However, the MD account (Rank 95) is protected from non-DEV status/role changes.
        const targetRank = req.body.role ? (0, auth_middleware_1.getRoleRank)(req.body.role) : undefined;
        const currentTargetRank = (0, auth_middleware_1.getRoleRank)(targetUser.role);
        if (actorRank < 85 && actorRole !== 'DEV') {
            // Protect Administrative Roles from lower ranks (staff, supervisors, etc)
            if ((targetRank && targetRank >= 85) || currentTargetRank >= 85) {
                return res.status(403).json({ message: 'Access denied: Only managers can manage administrative roles.' });
            }
        }
        // 🛡️ MD PROTECTION: Only the MD or DEV can change the role/status of the MD account
        if (currentTargetRank >= 95 && actorId !== targetId && actorRole !== 'DEV') {
            if (req.body.role || req.body.status) {
                return res.status(403).json({ message: 'Access denied: The Managing Director account can only be modified by the MD or a System Architect.' });
            }
        }
        // 🛡️ Validate SubUnit/Department pairing
        const newDeptId = req.body.departmentId ? Number(req.body.departmentId) : targetUser.departmentId;
        const newSubUnitId = req.body.subUnitId !== undefined ? req.body.subUnitId : targetUser.subUnitId;
        if (newSubUnitId && newDeptId) {
            const subUnit = await client_1.default.subUnit.findUnique({ where: { id: newSubUnitId } });
            if (subUnit && subUnit.departmentId !== newDeptId) {
                return res.status(400).json({ error: 'The selected sub-unit does not belong to the selected department.' });
            }
        }
        const user = await userService.updateUser(organizationId, targetId, req.body, userReq.id);
        const { passwordHash, ...safe } = user;
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_UPDATED', 'User', targetId, { fields: Object.keys(req.body) }, req.ip);
        res.json(withDepartment(getSafeUser(safe, actorRole)));
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.updateEmployee = updateEmployee;
// ─── DELETE EMPLOYEE (MD/HR only — hard delete with cascade) ─────────────
const deleteEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const actorId = userReq.id;
        const targetId = req.params.id;
        // Prevent self-deletion
        if (actorId === targetId)
            return res.status(400).json({ message: 'Cannot delete your own account.' });
        // Check if target is MD (cannot delete MD via API)
        const target = await client_1.default.user.findFirst({
            where: { id: targetId, organizationId },
            select: { role: true, fullName: true }
        });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        if ((0, auth_middleware_1.getRoleRank)(target.role) >= 90) {
            return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
        }
        await userService.deleteUser(organizationId, targetId);
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_ARCHIVED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
        res.status(204).send();
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.deleteEmployee = deleteEmployee;
// ─── HARD DELETE EMPLOYEE (MD/HR only — destructive) ─────────────
const hardDeleteEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const actorId = userReq.id;
        const targetId = req.params.id;
        if (actorId === targetId)
            return res.status(400).json({ message: 'Cannot delete your own account.' });
        // Restrict HARD DELETE to MD/DEV only (Rank 90+)
        if (userReq.rank < 90 && userReq.role !== 'DEV') {
            return res.status(403).json({ message: 'Access denied: Only the MD or System Admin can perform destructive hard deletions.' });
        }
        const target = await client_1.default.user.findFirst({
            where: { id: targetId, organizationId },
            select: { role: true, fullName: true }
        });
        if (!target)
            return res.status(404).json({ message: 'User not found' });
        if ((0, auth_middleware_1.getRoleRank)(target.role) >= 90) {
            return res.status(403).json({ message: 'Cannot delete MD or System Admin accounts.' });
        }
        await userService.hardDeleteUser(organizationId, targetId);
        await (0, audit_service_1.logAction)(actorId, 'EMPLOYEE_HARD_DELETED', 'User', targetId, { name: target.fullName, role: target.role }, req.ip);
        res.status(204).send();
    }
    catch (err) {
        console.error('[HARD_DELETE_ERROR]', err);
        res.status(500).json({
            error: 'Constraint violation or database error during hard delete.',
            message: err.message,
            code: err.code,
            meta: err.meta
        });
    }
};
exports.hardDeleteEmployee = hardDeleteEmployee;
// ─── ASSIGN ROLE (MD only) ────────────────────────────────────────────────
const assignRole = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const actorId = userReq.id;
        const actorRole = userReq.role;
        const actorRank = (0, auth_middleware_1.getRoleRank)(actorRole);
        const { userId, role, supervisorId } = req.body;
        const privilegedRoles = ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
        if (actorRank < 80 || !privilegedRoles.includes(actorRole)) {
            return res.status(403).json({ error: 'Access denied: Only MD, HR, or IT can manage personnel role assignments.' });
        }
        const validRoles = ['DEV', 'MD', 'HR_OFFICER', 'IT_MANAGER', 'DIRECTOR', 'MANAGER', 'SUPERVISOR', 'STAFF', 'CASUAL'];
        // 🛡️ Hierarchy Guard: Only MD/DEV (90+) or Admin Managers (85+) can assign roles >= 85 (HR/IT Manager)
        const targetRoleRank = (0, auth_middleware_1.getRoleRank)(role);
        if (actorRank < 85 && actorRole !== 'DEV' && targetRoleRank >= 85) {
            return res.status(403).json({ error: 'Access denied: Only the MD or Administrative Managers can assign administrative roles.' });
        }
        // 🛡️ Cannot promote someone to a rank higher than yourself
        if (actorRank < targetRoleRank && actorRole !== 'DEV') {
            return res.status(403).json({ error: 'Access denied: You cannot assign a role with a higher rank than your own.' });
        }
        // 🛡️ Hierarchy Guard: Anti-Recursion check
        if (supervisorId) {
            const isCycle = await hierarchy_service_1.HierarchyService.detectCycle(userId, supervisorId);
            if (isCycle) {
                return res.status(400).json({ error: 'Circular reporting detected: An employee cannot report to their own subordinate.' });
            }
        }
        const updateData = { role };
        // Use syncPrimaryReporting to keep both layers (User & Matrix) in sync
        await hierarchy_service_1.HierarchyService.syncPrimaryReporting(organizationId, userId, supervisorId || null);
        const user = await client_1.default.user.update({
            where: { id: userId, organizationId },
            data: updateData,
            select: { id: true, fullName: true, role: true, supervisorId: true }
        });
        await (0, websocket_service_1.notify)(userId, 'Your Role Has Been Updated', `Your role has been changed to ${role}.`, 'INFO');
        await (0, audit_service_1.logAction)(actorId, 'ROLE_ASSIGNED', 'User', userId, { role, supervisorId }, req.ip);
        res.json({ success: true, user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
};
exports.assignRole = assignRole;
// ─── UPLOAD AVATAR ────────────────────────────────────────────────────────
const uploadImage = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const { role: actorRole, id: actorId } = userReq;
        const targetId = req.params.id;
        const rank = (0, auth_middleware_1.getRoleRank)(actorRole);
        const privilegedRoles = ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'IT_ADMIN'];
        // 🛡️ REQUISITE: Only MD, HR, or IT can upload images (unless it's the user's own profile, but even then, policies might differ)
        // User requested "IT, HR, MD" specifically.
        if (rank < 80 || !privilegedRoles.includes(actorRole)) {
            if (actorId !== targetId) {
                return res.status(403).json({ message: 'Access denied: Profile imagery can only be managed by MD, HR, or IT.' });
            }
        }
        let publicUrl = null;
        const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
        const fs = (await Promise.resolve().then(() => __importStar(require('fs')))).default;
        const path = (await Promise.resolve().then(() => __importStar(require('path')))).default;
        const { storageService } = await Promise.resolve().then(() => __importStar(require('../services/firebase-storage.service')));
        // A: Multipart file upload (Multer)
        if (req.file) {
            try {
                const webpBuffer = await sharp(req.file.path)
                    .resize(400, 400, { fit: 'cover' })
                    .webp({ quality: 85 })
                    .toBuffer();
                try {
                    publicUrl = await storageService.uploadFile(webpBuffer, `${targetId}-avatar.webp`, 'avatars');
                    console.log(`[UploadAvatar] Cloud persist successful for ${targetId}`);
                }
                catch (cloudErr) {
                    console.warn('[UploadAvatar] Cloud fallback to Base64 persistence:', cloudErr);
                    // 🛡️ SURVIVAL VECTOR: Conver to data URI for permanent DB storage if Cloud is down
                    const b64 = webpBuffer.toString('base64');
                    publicUrl = `data:image/webp;base64,${b64}`;
                    // Extra layer: Attempt local write just in case persistent disk exists
                    try {
                        const filename = `avatar-${targetId}-${Date.now()}.webp`;
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
                        if (!fs.existsSync(uploadDir))
                            fs.mkdirSync(uploadDir, { recursive: true });
                        const filepath = path.join(uploadDir, filename);
                        await sharp(webpBuffer).toFile(filepath);
                    }
                    catch (e) { }
                }
                finally {
                    try {
                        fs.unlinkSync(req.file.path);
                    }
                    catch { }
                }
            }
            catch (sharpErr) {
                console.error('[UploadAvatar] Multipart Sharp Failure:', sharpErr);
                throw new Error(`Multipart processing failed: ${sharpErr.message}`);
            }
        }
        // B: Base64
        if (!publicUrl && req.body.image) {
            try {
                const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
                const buf = Buffer.from(base64, 'base64');
                const webpBuffer = await sharp(buf)
                    .resize(400, 400, { fit: 'cover' })
                    .webp({ quality: 85 })
                    .toBuffer();
                try {
                    publicUrl = await storageService.uploadFile(webpBuffer, `${targetId}-avatar.webp`, 'avatars');
                }
                catch (cloudErr) {
                    console.warn('[UploadAvatar] Cloud (Base64) fallback to Base64 persistence:', cloudErr);
                    const b64 = webpBuffer.toString('base64');
                    publicUrl = `data:image/webp;base64,${b64}`;
                    try {
                        const filename = `avatar-${targetId}-${Date.now()}.webp`;
                        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
                        if (!fs.existsSync(uploadDir))
                            fs.mkdirSync(uploadDir, { recursive: true });
                        const filepath = path.join(uploadDir, filename);
                        await sharp(webpBuffer).toFile(filepath);
                    }
                    catch (e) { }
                }
            }
            catch (sharpErr) {
                console.error('[UploadAvatar] Base64 Sharp Failure:', sharpErr);
                throw new Error(`Base64 processing failed: ${sharpErr.message}`);
            }
        }
        // C: URL string provided directly
        if (!publicUrl && req.body.avatarUrl) {
            publicUrl = req.body.avatarUrl;
        }
        if (!publicUrl)
            return res.status(400).json({ message: 'No image provided.' });
        await userService.updateUser(organizationId, targetId, { avatarUrl: publicUrl }, userReq.id);
        await (0, audit_service_1.logAction)(actorId, 'AVATAR_UPDATED', 'User', targetId, {}, req.ip);
        res.json({ url: publicUrl, message: 'Avatar updated successfully' });
    }
    catch (err) {
        console.error('[UploadAvatar] Crash:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            details: err.message,
            success: false
        });
    }
};
exports.uploadImage = uploadImage;
// ─── UPLOAD SIGNATURE ─────────────────────────────────────────────────────
const uploadSignature = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const { id: actorId } = userReq;
        const targetId = req.params.id;
        // 🛡️ REQUISITE: Only self-upload or MD/HR/IT
        const actorRole = userReq.role;
        const rank = (0, auth_middleware_1.getRoleRank)(actorRole);
        if (rank < 80 && actorId !== targetId) {
            return res.status(403).json({ message: 'Access denied: You can only manage your own digital signature.' });
        }
        if (!req.body.image)
            return res.status(400).json({ message: 'No signature image provided.' });
        // 🗑️ DELETION LOGIC: If 'none', clear the signature
        if (req.body.image === 'none') {
            await userService.updateUser(organizationId, targetId, { signatureUrl: null }, userReq.id);
            await (0, audit_service_1.logAction)(actorId, 'SIGNATURE_DELETED', 'User', targetId, {}, req.ip);
            return res.json({ message: 'Signature deleted successfully', url: null });
        }
        const sharp = (await Promise.resolve().then(() => __importStar(require('sharp')))).default;
        const { storageService } = await Promise.resolve().then(() => __importStar(require('../services/firebase-storage.service')));
        let publicUrl = null;
        const base64 = req.body.image.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(base64, 'base64');
        // Process signature: keep transparency, moderate quality
        const webpBuffer = await sharp(buf)
            .resize(600, 300, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 90, lossless: true })
            .toBuffer();
        try {
            publicUrl = await storageService.uploadFile(webpBuffer, `${targetId}-signature.webp`, 'signatures');
        }
        catch (cloudErr) {
            // Fallback to base64 persistence
            publicUrl = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
        }
        await userService.updateUser(organizationId, targetId, { signatureUrl: publicUrl }, userReq.id);
        await (0, audit_service_1.logAction)(actorId, 'SIGNATURE_UPDATED', 'User', targetId, {}, req.ip);
        res.json({ url: publicUrl, message: 'Digital signature updated successfully' });
    }
    catch (err) {
        console.error('[UploadSignature] Error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
};
exports.uploadSignature = uploadSignature;
// ─── GET SUPERVISORS LIST (for dropdowns) ────────────────────────────────
const getSupervisors = async (req, res) => {
    const user = req.user;
    const organizationId = user.organizationId || 'mcb-ghana-tenant';
    const supervisors = await client_1.default.user.findMany({
        where: {
            organizationId,
            role: { in: ['MD', 'DIRECTOR', 'HR_OFFICER', 'IT_MANAGER', 'MANAGER', 'SUPERVISOR'] },
            status: 'ACTIVE',
            NOT: { role: 'DEV' } // Redundant but safe
        },
        select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
        orderBy: { fullName: 'asc' },
        take: 100
    });
    res.json(supervisors);
};
exports.getSupervisors = getSupervisors;
// ─── RISK PROFILE ─────────────────────────────────────────────────────────
// ─── ARCHIVE EMPLOYEE (Soft Delete) ──────────────────────────────────────
const archiveEmployee = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const { id } = req.params;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: { isArchived: true, status: 'ARCHIVED', archivedDate: new Date() }
        });
        await (0, audit_service_1.logAction)(user.id, 'EMPLOYEE_ARCHIVED', 'User', id, {}, req.ip);
        res.json({ message: 'Employee archived successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.archiveEmployee = archiveEmployee;
// ─── RESTORE EMPLOYEE ─────────────────────────────────────────────────────
const restoreEmployee = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const { id } = req.params;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: { isArchived: false, status: 'ACTIVE', archivedDate: null }
        });
        await (0, audit_service_1.logAction)(user.id, 'EMPLOYEE_RESTORED', 'User', id, {}, req.ip);
        res.json({ message: 'Employee restored successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.restoreEmployee = restoreEmployee;
// ─── TRANSFER DEPARTMENT ──────────────────────────────────────────────────
const transferEmployee = async (req, res) => {
    try {
        const user = req.user;
        const organizationId = user.organizationId || 'mcb-ghana-tenant';
        const { id } = req.params;
        const { departmentId, reason } = req.body;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: { departmentId: parseInt(departmentId) }
        });
        await (0, audit_service_1.logAction)(user.id, 'EMPLOYEE_TRANSFERRED', 'User', id, { departmentId, reason }, req.ip);
        res.json({ message: 'Employee transferred successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.transferEmployee = transferEmployee;
// ─── PROMOTE EMPLOYEE ─────────────────────────────────────────────────────
const promoteEmployee = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const { id } = req.params;
        const { jobTitle, role, salary, reason } = req.body;
        const updateData = { jobTitle, role };
        if (salary)
            updateData.salary = salary;
        await client_1.default.user.update({
            where: { id, organizationId },
            data: updateData
        });
        // Optionally log in history
        await client_1.default.employeeHistory.create({
            data: {
                organizationId,
                employeeId: id,
                title: 'Promotion',
                description: `Promoted to ${jobTitle} (${role}). Reason: ${reason || 'N/A'}`,
                type: 'PROMOTION',
                createdById: userReq.id
            }
        });
        await (0, audit_service_1.logAction)(userReq.id, 'EMPLOYEE_PROMOTED', 'User', id, { jobTitle, role, reason }, req.ip);
        res.json({ message: 'Employee promoted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.promoteEmployee = promoteEmployee;
const getUserRiskProfile = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const profile = await riskService.getRiskProfile(organizationId, req.params.id);
        res.json(profile);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.getUserRiskProfile = getUserRiskProfile;
const resetEmployeePassword = async (req, res) => {
    try {
        const userReq = req.user;
        const organizationId = userReq.organizationId || 'mcb-ghana-tenant';
        const actorId = userReq.id;
        const targetId = req.params.id;
        const { newPassword } = req.body;
        if (!newPassword)
            return res.status(400).json({ error: 'newPassword is required' });
        if (newPassword.length < 8)
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        const targetUser = await client_1.default.user.findUnique({ where: { id: targetId, organizationId } });
        if (!targetUser)
            return res.status(404).json({ error: 'User not found' });
        // Hierarchy Guard: IT/HR Managers (Rank 85+) can reset all accounts.
        // However, the MD account (Rank 95) can only be reset by the MD or DEV.
        const targetRank = (0, auth_middleware_1.getRoleRank)(targetUser.role);
        if (userReq.rank < 85 && userReq.role !== 'DEV') {
            return res.status(403).json({ error: 'Access denied: Only managers can reset passwords.' });
        }
        if (targetRank >= 95 && actorId !== targetId && userReq.role !== 'DEV') {
            return res.status(403).json({ error: 'Access denied: The Managing Director password can only be reset by the MD or a System Architect.' });
        }
        await userService.adminResetPassword(organizationId, targetId, newPassword);
        await (0, audit_service_1.logAction)(actorId, 'PWD_ADMIN_RESET', 'User', targetId, { adminId: actorId }, req.ip);
        res.json({ success: true, message: 'Password has been reset and all sessions revoked.' });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
};
exports.resetEmployeePassword = resetEmployeePassword;
// Legacy alias
exports.createEmployeeWithNotifications = exports.createEmployee;
