"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAsset = exports.returnAsset = exports.assignAsset = exports.getAllAssets = exports.createAsset = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const createAsset = async (organizationId, data) => {
    if (data.purchaseDate)
        data.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry)
        data.warrantyExpiry = new Date(data.warrantyExpiry);
    return client_1.default.asset.create({
        data: {
            ...data,
            organizationId
        }
    });
};
exports.createAsset = createAsset;
const getAllAssets = async (organizationId) => {
    return client_1.default.asset.findMany({
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
exports.getAllAssets = getAllAssets;
const assignAsset = async (organizationId, assetId, userId, condition, signature) => {
    const asset = await client_1.default.asset.findFirst({
        where: { id: assetId, organizationId }
    });
    if (!asset)
        throw new Error("Asset not found");
    if (asset.status !== 'AVAILABLE')
        throw new Error("Asset is not available for assignment");
    return client_1.default.$transaction(async (tx) => {
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
exports.assignAsset = assignAsset;
const returnAsset = async (organizationId, assetId, condition, signature) => {
    const asset = await client_1.default.asset.findFirst({
        where: { id: assetId, organizationId },
        include: { assignments: { where: { returnedAt: null, organizationId } } }
    });
    if (!asset)
        throw new Error("Asset not found");
    if (asset.assignments.length === 0)
        throw new Error("Asset is not currently assigned");
    const assignmentId = asset.assignments[0].id;
    return client_1.default.$transaction(async (tx) => {
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
exports.returnAsset = returnAsset;
const deleteAsset = async (organizationId, assetId) => {
    return client_1.default.asset.deleteMany({
        where: { id: assetId, organizationId }
    });
};
exports.deleteAsset = deleteAsset;
