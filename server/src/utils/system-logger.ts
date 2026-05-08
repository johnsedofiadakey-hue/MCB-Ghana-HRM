import prisma from '../prisma/client';

export interface SystemLogParams {
  action: string;
  details?: string;
  operatorId: string;
  operatorEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export const logSystemAction = async (params: SystemLogParams) => {
  try {
    await prisma.systemLog.create({
      data: {
        action: params.action,
        details: params.details,
        operatorId: params.operatorId,
        operatorEmail: params.operatorEmail,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log system action:', error);
  }
};
