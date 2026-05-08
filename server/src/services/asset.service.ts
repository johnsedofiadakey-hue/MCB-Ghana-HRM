import prisma from '../prisma/client';

export const createAsset = async (organizationId: string, data: any) => {
    if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry) data.warrantyExpiry = new Date(data.warrantyExpiry);

    return prisma.asset.create({
        data: {
            ...data,
            organizationId
        }
    });
};

export const getAllAssets = async (organizationId: string) => {
    return prisma.asset.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
            assignments: {
                where: { returnedAt: null, organizationId },
                include: { user: { select: { fullName: true, departmentId: true } } }
            }
        }
    });
};

export const assignAsset = async (organizationId: string, assetId: string, userId: string, condition?: string, signature?: string) => {
    const asset = await prisma.asset.findFirst({
        where: { id: assetId, organizationId }
    });
    if (!asset) throw new Error("Asset not found");
    if (asset.status !== 'AVAILABLE') throw new Error("Asset is not available for assignment");

    return prisma.$transaction(async (tx) => {
        const assignment = await tx.assetAssignment.create({
            data: {
                organizationId,
                assetId,
                userId,
                conditionOnAssign: condition,
                handoverSignature: signature
            }
        });

        await tx.asset.update({
            where: { id: assetId },
            data: { status: 'ASSIGNED' }
        });

        return assignment;
    });
};

export const returnAsset = async (organizationId: string, assetId: string, condition?: string, signature?: string) => {
    const asset = await prisma.asset.findFirst({
        where: { id: assetId, organizationId },
        include: { assignments: { where: { returnedAt: null, organizationId } } }
    });

    if (!asset) throw new Error("Asset not found");
    if (asset.assignments.length === 0) throw new Error("Asset is not currently assigned");

    const assignmentId = asset.assignments[0].id;

    return prisma.$transaction(async (tx) => {
        const assignment = await tx.assetAssignment.update({
            where: { id: assignmentId },
            data: {
                returnedAt: new Date(),
                conditionOnReturn: condition,
                returnSignature: signature
            }
        });

        await tx.asset.update({
            where: { id: assetId },
            data: { status: 'AVAILABLE' }
        });

  return assignment;
});
};

export const deleteAsset = async (organizationId: string, assetId: string) => {
    return prisma.asset.deleteMany({
        where: { id: assetId, organizationId }
    });
};
