import prisma from '../prisma/client';

export const createCycle = async (organizationId: string, data: {
  name: string;
  type: string;
  startDate: string | Date;
  endDate: string | Date;
}) => {
  return prisma.cycle.create({
    data: {
      organizationId,
      name: data.name,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'DRAFT',
    },
  });
};

export const getCycles = async (organizationId: string, filter?: { status?: string }) => {
  return prisma.cycle.findMany({
    where: { ...filter, organizationId },
    orderBy: { startDate: 'desc' },
  });
};

export const getCycleById = async (organizationId: string, id: string) => {
  return prisma.cycle.findFirst({
    where: { id, organizationId },
  });
};

export const updateCycle = async (organizationId: string, id: string, data: Partial<{
  name: string;
  status: string;
  startDate: Date | string;
  endDate: Date | string;
}>) => {
  const updateData: any = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  return prisma.cycle.updateMany({
    where: { id, organizationId },
    data: updateData,
  });
};

export const deleteCycle = async (organizationId: string, id: string) => {
  return prisma.cycle.deleteMany({ where: { id, organizationId } });
};
