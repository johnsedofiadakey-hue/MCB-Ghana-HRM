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

export const getHistoryByEmployee = async (organizationId: string, employeeId: string) => {
    return prisma.employeeHistory.findMany({
        where: { employeeId, organizationId },
        orderBy: { createdAt: 'desc' },
        include: { loggedBy: { select: { fullName: true, id: true } } }
    });
};

export const updateHistoryStatus = async (organizationId: string, id: string, status: string) => {
    return prisma.employeeHistory.updateMany({
        where: { id, organizationId },
        data: { status }
    });
};
