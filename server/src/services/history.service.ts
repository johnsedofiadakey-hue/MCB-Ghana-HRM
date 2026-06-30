import prisma from '../prisma/client';

export const createHistory = async (data: {
    organizationId: string;
    employeeId: string;
    loggedById: string;
    type: string;
    title: string;
    description?: string;
    severity?: string;
    status?: string;
}) => {
    const employee = await prisma.user.findFirst({
        where: { id: data.employeeId, organizationId: data.organizationId },
        select: { id: true }
    });
    if (!employee) throw new Error('Employee not found in this organization');

    return prisma.employeeHistory.create({
        data: {
            organizationId: data.organizationId,
            employeeId: data.employeeId,
            loggedById: data.loggedById,
            type: data.type,
            title: data.title,
            description: data.description,
            change: data.description || data.title,
            severity: data.severity || 'LOW',
            status: data.status || 'OPEN'
        },
        include: { loggedBy: { select: { fullName: true, jobTitle: true } } }
    });
};

export const getHistoryById = async (organizationId: string, id: string) => {
    return prisma.employeeHistory.findFirst({
        where: { id, organizationId },
        select: { id: true, employeeId: true, status: true }
    });
};

export const getHistoryByEmployee = async (organizationId: string, employeeId: string) => {
    return prisma.employeeHistory.findMany({
        where: { employeeId, organizationId },
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { fullName: true, id: true } } }
    });
};

export const updateHistoryStatus = async (organizationId: string, id: string, status: string) => {
    const record = await getHistoryById(organizationId, id);
    if (!record) throw new Error('Employee history record not found');

    return prisma.employeeHistory.update({ where: { id: record.id }, data: { status } });
};
