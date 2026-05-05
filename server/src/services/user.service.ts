import prisma from '../prisma/client';
type User = any;
import bcrypt from 'bcryptjs';
import { maybeEncrypt } from '../utils/encryption';
import { ROLE_RANK_MAP } from '../types/roles';

const getRankFromRole = (role: string): number => {
    if (!role) return 40;
    return ROLE_RANK_MAP[role.toUpperCase()] ?? 40;
};

const resolveDepartmentId = async (organizationId: string, department?: string, departmentId?: number | null) => {
    if (departmentId !== undefined) return departmentId;
    if (!department || typeof department !== 'string') return undefined;
    
    const name = department.trim();
    if (!name) return undefined;

    // 🛡️ CRITICAL FIX: If the 'name' is actually a numeric string (e.g. "1", "2"),
    // it was likely a departmentId sent to the wrong field. Do NOT create a department named "1".
    if (/^\d+$/.test(name)) {
        return parseInt(name);
    }

    const existing = await prisma.department.findFirst({
        where: { name, organizationId }
    });
    if (existing) return existing.id;

    const created = await prisma.department.create({
        data: { name, organizationId }
    });
    return created.id;
};

export const createUser = async (organizationId: string, data: {
    email: string;
    fullName: string;
    role: string;
    department?: string;
    departmentId?: number;
    jobTitle: string;
    employeeCode?: string;
    status?: string;
    position?: string;
    joinDate?: Date | string;
    supervisorId?: string;
    password?: string;
    education?: string;
    // New Fields
    dob?: Date | string;
    gender?: string;
    nationalId?: string;
    contactNumber?: string;
    address?: string;
    nextOfKinName?: string;
    nextOfKinRelation?: string;
    nextOfKinContact?: string;
    salary?: number;
    currency?: any;
    bankAccountNumber?: string;
    ssnitNumber?: string;
    subUnitId?: string;
    secondarySupervisorId?: string;
    biometricId?: string;
} & any) => {
    const existingUser = await prisma.user.findFirst({ where: { email: data.email, organizationId } });
    if (existingUser) throw new Error('User with this email already exists');

    if (data.employeeCode) {
        const existingCode = await prisma.user.findFirst({
            where: { employeeCode: data.employeeCode, organizationId }
        });
        if (existingCode) throw new Error('User with this Employee Code already exists');
    }

    // Default password generation
    const plainPassword = data.password || 'SecureInit!';
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    // 🛡️ Strict Requirement Validation
    if (!data.email?.trim()) throw new Error('Employee validation failed: Email Address is required.');
    if (!data.fullName?.trim()) throw new Error('Employee validation failed: Full Name is required.');
    if (!data.jobTitle?.trim()) throw new Error('Employee validation failed: Job Title is required.');

    // 🛡️ Robust Input Normalization
    // Standardize empty strings and undefined into null/undefined for Prisma compatibility
    const safeData = { ...data };
    for (const key of Object.keys(safeData)) {
        if (safeData[key] === '' || safeData[key] === undefined) {
            safeData[key] = null;
        }
    }

    const resolvedDepartmentId = await resolveDepartmentId(organizationId, safeData.department, safeData.departmentId);

    const newUser = await prisma.user.create({
        data: {
            organizationId,
            email: safeData.email.trim(),
            fullName: safeData.fullName.trim().replace(/\./g, ' '),
            role: safeData.role || 'STAFF',
            departmentId: resolvedDepartmentId !== undefined ? resolvedDepartmentId : (safeData.departmentId ?? null),
            jobTitle: safeData.jobTitle.trim(),
            passwordHash,
            employeeCode: safeData.employeeCode,
            status: safeData.status || 'ACTIVE',
            rank: getRankFromRole(safeData.role || 'STAFF'),
            position: safeData.position || safeData.jobTitle.trim(),
            joinDate: (safeData.joinDate && safeData.joinDate !== null) ? new Date(safeData.joinDate) : null,
            supervisorId: safeData.supervisorId || null,
            subUnitId: safeData.subUnitId || null,

            // Personal Details
            dob: (safeData.dob && safeData.dob !== null) ? new Date(safeData.dob) : null,
            gender: safeData.gender,
            education: safeData.education,
            nationalId: safeData.nationalId,
            contactNumber: safeData.contactNumber,
            address: safeData.address,
            nationality: safeData.nationality,
            countryOfOrigin: safeData.countryOfOrigin,
            maritalStatus: safeData.maritalStatus,
            bloodGroup: safeData.bloodGroup,
            certifications: (safeData.certifications && Array.isArray(safeData.certifications)) ? JSON.stringify(safeData.certifications) : safeData.certifications,

            // Family & SOS
            nextOfKinName: safeData.nextOfKinName,
            nextOfKinRelation: safeData.nextOfKinRelation,
            nextOfKinContact: safeData.nextOfKinContact,
            emergencyContactName: safeData.emergencyContactName,
            emergencyContactPhone: safeData.emergencyContactPhone,

            // Compensation
            salary: (safeData.salary !== undefined && safeData.salary !== null) ? Number(safeData.salary) : null,
            currency: safeData.currency || 'GHS',
            leaveBalance: null,
            leaveAllowance: null,
            bankAccountEnc: maybeEncrypt(safeData.bankAccountNumber),
            ghanaCardEnc: maybeEncrypt(safeData.nationalId),
            ssnitEnc: maybeEncrypt(safeData.ssnitNumber),
            salaryEnc: maybeEncrypt(safeData.salary),
            biometricId: safeData.biometricId || null
        },
    });

    // ── PHASE 2 Sync: EmployeeReporting ─────────────────────────────
    // Create Primary Direct reporting line
    if (newUser.supervisorId) {
        await prisma.employeeReporting.upsert({
            where: { employeeId_managerId_type: { employeeId: newUser.id, managerId: newUser.supervisorId, type: 'DIRECT' } },
            create: { organizationId, employeeId: newUser.id, managerId: newUser.supervisorId, type: 'DIRECT', isPrimary: true },
            update: { isPrimary: true, effectiveTo: null }
        });
    }

    // Create Secondary Dotted reporting line
    if (safeData.secondarySupervisorId) {
        await prisma.employeeReporting.upsert({
            where: { employeeId_managerId_type: { employeeId: newUser.id, managerId: safeData.secondarySupervisorId, type: 'DOTTED' } },
            create: { organizationId, employeeId: newUser.id, managerId: safeData.secondarySupervisorId, type: 'DOTTED', isPrimary: false },
            update: { isPrimary: false, effectiveTo: null }
        });
    }

    return newUser;
};

export const getUserById = async (organizationId: string, id: string) => {
    return prisma.user.findFirst({
        where: { id, organizationId },
        include: {
            organization: { select: { defaultLeaveAllowance: true } },
            supervisor: { select: { id: true, fullName: true, email: true } },
            subordinates: { select: { id: true, fullName: true, jobTitle: true } },
            departmentObj: { select: { name: true } },
            employeeReportingLines: {
                where: { effectiveTo: null },
                include: { manager: { select: { id: true, fullName: true } } }
            },
            historyLogs: {
                orderBy: { createdAt: 'desc' },
                include: { 
                    createdBy: { select: { fullName: true } },
                    loggedBy: { select: { fullName: true } }
                }
            },
            appraisalPackets: {
                include: { 
                    cycle: true, 
                    reviews: {
                        include: { reviewer: { select: { fullName: true, avatarUrl: true } } }
                    } 
                },
                orderBy: { createdAt: 'desc' }
            },
            targetsAssignedToMe: {
                include: { metrics: true, updates: { orderBy: { createdAt: 'desc' }, take: 5 } },
                orderBy: { updatedAt: 'desc' }
            }
        }
    });
};

export const getAllUsers = async (organizationId: string | null, filter?: { department?: string, role?: string, status?: string, take?: number, skip?: number, search?: string } & any) => {
    const { take, skip, search, ...where } = filter || {};
    if (organizationId) {
        where.organizationId = organizationId;
    }

    if (search) {
        where.OR = [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
            { jobTitle: { contains: search, mode: 'insensitive' } }
        ];
    }

    // If organizationId is null (e.g. for autonomous DEV), it returns all users across all organizations
    return prisma.user.findMany({
        where,
        orderBy: { fullName: 'asc' },
        take: parseInt(take as any) || 100,
        skip: parseInt(skip as any) || 0,
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            departmentId: true,
            departmentObj: { select: { name: true } },
            subUnitId: true,
            subUnit: { select: { name: true } },
            jobTitle: true,
            employeeCode: true,
            status: true,
            avatarUrl: true,
            supervisorId: true,
            employeeReportingLines: {
                where: { effectiveTo: null },
                select: { id: true, managerId: true, type: true, isPrimary: true }
            }
        }
    });
};

export const updateUser = async (
    organizationId: string,
    id: string,
    data: Partial<User> & { dob?: string | Date, joinDate?: string | Date, department?: string, departmentId?: number | null, password?: string },
    actorId?: string
) => {
    // 🛡️ Fetch current state for milestone tracking
    const oldUser = await prisma.user.findUnique({ 
        where: { id },
        include: { departmentObj: { select: { name: true } } }
    });

    // Exclude password from direct update here usually
    const { password, passwordHash, department, departmentId, email, ...safeData } = data as any;

    // 🛡️ Email Uniqueness Check
    if (email) {
        const existingEmail = await prisma.user.findFirst({
            where: { 
                email, 
                organizationId,
                NOT: { id }
            }
        });
        if (existingEmail) throw new Error('Another user with this email already exists.');
        safeData.email = email;
    }

    if (safeData.fullName) {
        safeData.fullName = safeData.fullName.trim().replace(/\./g, ' ');
    }

    const resolvedDepartmentId = await resolveDepartmentId(organizationId, department, departmentId);
    if (resolvedDepartmentId !== undefined) {
        safeData.departmentId = resolvedDepartmentId;
    }

    if (safeData.dob && safeData.dob !== '') safeData.dob = new Date(safeData.dob);
    else if (safeData.dob === '') safeData.dob = null;
    
    if (safeData.joinDate && safeData.joinDate !== '') safeData.joinDate = new Date(safeData.joinDate);
    else if (safeData.joinDate === '') safeData.joinDate = null;

    if (safeData.salary !== undefined && safeData.salary !== null && safeData.salary !== '') {
        safeData.salary = Number(safeData.salary);
    } else if (safeData.salary === '') {
        safeData.salary = null;
    }

    if (safeData.leaveBalance !== undefined && safeData.leaveBalance !== null) safeData.leaveBalance = Number(safeData.leaveBalance);
    if (safeData.leaveAllowance !== undefined && safeData.leaveAllowance !== null) safeData.leaveAllowance = Number(safeData.leaveAllowance);

    // Hard delete restricted fields that should not be in the update payload
    delete safeData.id;
    delete safeData.organizationId;
    delete safeData.organization;
    delete safeData.passwordHash;
    delete safeData.password;
    delete safeData.subUnit;
    delete safeData.departmentObj;
    delete safeData.supervisor;
    delete safeData.subordinates;
    delete safeData.kpiSheets;
    delete safeData.riskScore;
    delete safeData.createdAt;
    delete safeData.updatedAt;
    
    // We remove avatarUrl from direct safeData object update NOT because we block it, 
    // but because prisma.user.update({...safeData}) might fail if avatarUrl is not exactly a string 
    // or if we want to ensure it's handled by the upload endpoint ONLY if provided as null/string here.
    // Actually, letting it pass through if it's a string is fine.
    // delete safeData.avatarUrl; // RESTORED: Allow pass-through if frontend sends it
    
    delete safeData.subUnit;

    if (safeData.bankAccountNumber !== undefined) safeData.bankAccountEnc = maybeEncrypt(String(safeData.bankAccountNumber || ''));
    if (safeData.nationalId !== undefined) safeData.ghanaCardEnc = maybeEncrypt(String(safeData.nationalId || ''));
    if (safeData.ssnitNumber !== undefined) safeData.ssnitEnc = maybeEncrypt(String(safeData.ssnitNumber || ''));
    if (safeData.salary !== undefined && safeData.salary !== null) safeData.salaryEnc = maybeEncrypt(String(safeData.salary));
    
    // Handle certifications array-to-string conversion
    if (Array.isArray(safeData.certifications)) {
        safeData.certifications = JSON.stringify(safeData.certifications);
    }

    // Explicitly nullify other potential empty strings
    for (const key of ['education', 'gender', 'contactNumber', 'employeeCode', 'nationalId', 'address', 'dob', 'bankAccountNumber', 'bankName', 'bankBranch', 'ssnitNumber', 'nationality', 'countryOfOrigin', 'maritalStatus', 'bloodGroup', 'emergencyContactName', 'emergencyContactPhone', 'nextOfKinName', 'nextOfKinRelation', 'nextOfKinContact', 'subUnitId', 'secondarySupervisorId', 'supervisorId', 'biometricId']) {
        if (safeData[key] === '') safeData[key] = null;
    }

    if (safeData.certifications !== undefined && Array.isArray(safeData.certifications)) safeData.certifications = JSON.stringify(safeData.certifications);

    const extractedSecondarySupervisorId = safeData.secondarySupervisorId;
    delete safeData.secondarySupervisorId;

    if (safeData.role) {
        safeData.rank = getRankFromRole(safeData.role);
    }

    const updatedUser = await prisma.user.update({
        where: { id },
        data: {
            ...safeData,
            organizationId // Ensure it doesn't change or is set
        }
    });

    // ── PHASE 2 Sync: EmployeeReporting ─────────────────────────────
    if (safeData.supervisorId !== undefined) {
        if (safeData.supervisorId) {
            // Deactivate ANY current primary direct manager that isn't the new one
            await prisma.employeeReporting.updateMany({
                where: { 
                    employeeId: id, 
                    organizationId, 
                    type: 'DIRECT', 
                    isPrimary: true,
                    managerId: { not: safeData.supervisorId }
                },
                data: { isPrimary: false, effectiveTo: new Date() }
            });

            await prisma.employeeReporting.upsert({
                where: { employeeId_managerId_type: { employeeId: id, managerId: safeData.supervisorId, type: 'DIRECT' } },
                create: { organizationId, employeeId: id, managerId: safeData.supervisorId, type: 'DIRECT', isPrimary: true },
                update: { isPrimary: true, effectiveTo: null }
            });
        } else {
            // Remove primary if explicit null
            await prisma.employeeReporting.updateMany({
                where: { employeeId: id, organizationId, isPrimary: true, type: 'DIRECT' },
                data: { effectiveTo: new Date(), isPrimary: false }
            });
        }
    }

    if (extractedSecondarySupervisorId !== undefined) {
        if (extractedSecondarySupervisorId) {
            await prisma.employeeReporting.upsert({
                where: { employeeId_managerId_type: { employeeId: id, managerId: extractedSecondarySupervisorId, type: 'DOTTED' } },
                create: { organizationId, employeeId: id, managerId: extractedSecondarySupervisorId, type: 'DOTTED', isPrimary: false },
                update: { isPrimary: false, effectiveTo: null }
            });
        } else {
            // Remove secondary if explicit null
            await prisma.employeeReporting.updateMany({
                where: { employeeId: id, organizationId, type: 'DOTTED' },
                data: { effectiveTo: new Date() }
            });
        }
    }

    // 🛡️ LOG PROFESSIONAL MILESTONES (If actorId provided)
    if (actorId && oldUser) {
        const logs: any[] = [];
        const logData = { organizationId, employeeId: id, loggedById: actorId, severity: 'INFO' };

        // 1. Role Change (Promotion/Demotion)
        if (safeData.role && safeData.role !== oldUser.role) {
            const oldRank = getRankFromRole(oldUser.role);
            const newRank = getRankFromRole(safeData.role);
            const type = newRank > oldRank ? 'PROMOTION' : newRank < oldRank ? 'DEMOTION' : 'REASSIGNMENT';
            logs.push(prisma.employeeHistory.create({
                data: {
                    ...logData,
                    title: `Role Change: ${type}`,
                    description: `Employment role updated from ${oldUser.role} to ${safeData.role}.`,
                    change: `${oldUser.role} -> ${safeData.role}`,
                    type
                }
            }));
        }

        // 2. Job Title Change
        if (safeData.jobTitle && safeData.jobTitle !== oldUser.jobTitle) {
            logs.push(prisma.employeeHistory.create({
                data: {
                    ...logData,
                    title: 'Job Title Update',
                    description: `Official job title changed from "${oldUser.jobTitle}" to "${safeData.jobTitle}".`,
                    change: `${oldUser.jobTitle} -> ${safeData.jobTitle}`,
                    type: 'REASSIGNMENT'
                }
            }));
        }

        // 3. Department Change
        if (safeData.departmentId !== undefined && safeData.departmentId !== oldUser.departmentId) {
            const newDept = safeData.departmentId ? await prisma.department.findUnique({ where: { id: safeData.departmentId }, select: { name: true } }) : null;
            logs.push(prisma.employeeHistory.create({
                data: {
                    ...logData,
                    title: 'Departmental Reassignment',
                    description: `Transferred from ${oldUser.departmentObj?.name || 'Headquarters'} to ${newDept?.name || 'Headquarters'}.`,
                    change: `${oldUser.departmentObj?.name || 'Headquarters'} -> ${newDept?.name || 'Headquarters'}`,
                    type: 'REASSIGNMENT'
                }
            }));
        }

        if (logs.length > 0) await Promise.all(logs);
    }

    return updatedUser;
};

export const deleteUser = async (organizationId: string, id: string) => {
    // Soft delete (Archive)
    return prisma.user.updateMany({
        where: { id, organizationId },
        data: {
            status: 'ARCHIVED',
            isArchived: true,
            archivedDate: new Date()
        }
    });
};

export const hardDeleteUser = async (organizationId: string, id: string) => {
    // True destructive hard delete via strictly ordered transaction to bypass restrictive foreign keys
    return prisma.$transaction(async (tx) => {
        // 0. Pre-purge actor references (Nullify references where this user is an actor/manager)
        await tx.department.updateMany({
            where: { organizationId, managerId: id },
            data: { managerId: null }
        });
        await tx.subUnit.updateMany({
            where: { organizationId, managerId: id },
            data: { managerId: null }
        });
        await tx.user.updateMany({
            where: { organizationId, supervisorId: id },
            data: { supervisorId: null }
        });
        await tx.appraisalPacket.updateMany({
            where: { organizationId, resolvedById: id },
            data: { resolvedById: null }
        });
        await tx.expenseClaim.updateMany({
            where: { organizationId, approvedById: id },
            data: { approvedById: null }
        });
        await tx.loan.updateMany({
            where: { organizationId, approvedById: id },
            data: { approvedById: null }
        });
        await tx.supportTicket.updateMany({
            where: { organizationId, assignedToId: id },
            data: { assignedToId: null }
        });

        // 1. Purge Target Dependencies (Restrictive)
        await tx.targetUpdate.deleteMany({
            where: { 
                OR: [
                    { submittedById: id },
                    { target: { organizationId, OR: [{ originatorId: id }, { assigneeId: id }] } }
                ]
            }
        });

        await tx.targetAcknowledgement.deleteMany({
            where: { 
                OR: [
                    { userId: id },
                    { target: { organizationId, OR: [{ originatorId: id }, { assigneeId: id }] } }
                ]
            }
        });

        await tx.targetMetric.deleteMany({
            where: { target: { organizationId, OR: [{ originatorId: id }, { assigneeId: id }] } }
        });

        await tx.target.deleteMany({
            where: { 
                organizationId,
                OR: [
                    { originatorId: id },
                    { assigneeId: id },
                    { lineManagerId: id },
                    { reviewerId: id }
                ]
            }
        });

        // 2. Purge KPI Dependencies
        await tx.kpiSheet.deleteMany({
            where: { organizationId, employeeId: id }
        });

        // 3. Purge Operational Records (Cascading usually handles these, but we play it safe)
        await tx.leaveRequest.deleteMany({
            where: { organizationId, employeeId: id }
        });

        await tx.attendanceLog.deleteMany({
            where: { organizationId, employeeId: id }
        });

        // 4. Purge Appraisal Packets
        await tx.appraisalPacket.deleteMany({
            where: { organizationId, employeeId: id }
        });

        // 5. Purge Recruitment / Interview state (Actor roles)
        await tx.interviewFeedback.deleteMany({
            where: { organizationId, reviewerId: id }
        });
        await tx.interviewStage.updateMany({
            where: { organizationId, interviewerId: id },
            data: { interviewerId: null }
        });
        await tx.exitInterview.updateMany({
            where: { organizationId, interviewerId: id },
            data: { interviewerId: null }
        });

        // 6. Purge Security/Session context
        await tx.refreshToken.deleteMany({
            where: { organizationId, userId: id }
        });

        // 7. Purge Offboarding if applicable
        await tx.offboardingProcess.deleteMany({
            where: { organizationId, employeeId: id }
        });

        // 8. Purge Handover records (Requester or Reliever)
        await tx.handoverRecord.deleteMany({
            where: { organizationId, OR: [{ requesterId: id }, { relieverId: id }] }
        });

        // 9. Purge SaaS mapping
        await tx.saasSubscription.deleteMany({
            where: { organizationId, clientId: id }
        });

        // 10. Nullify remaining actor references (HR Reviewer, Manager, Reliever) in LeaveRequests
        await tx.leaveRequest.updateMany({
            where: { organizationId, OR: [{ hrReviewerId: id }, { managerId: id }, { relieverId: id }] },
            data: { hrReviewerId: null, managerId: null, relieverId: null }
        });

        // 11. Finally, delete the User
        return tx.user.deleteMany({
            where: { id, organizationId }
        });
    });
};

export const adminResetPassword = async (organizationId: string, id: string, newPassword: string) => {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    return prisma.$transaction([
        prisma.user.update({
            where: { id, organizationId },
            data: { passwordHash }
        }),
        // Revoke all current sessions for security after manual reset
        prisma.refreshToken.updateMany({
            where: { userId: id, organizationId, revokedAt: null },
            data: { revokedAt: new Date() }
        })
    ]);
};
