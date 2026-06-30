import { Router } from 'express';
import { authenticate, authorizeMinimumRole, requirePermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { validate, AssetSchema, AssetAssignSchema } from '../middleware/validate.middleware';
import * as assetController from '../controllers/asset.controller';

const router = Router();

// Get Inventory (All Staff)
router.get('/', authenticate, authorizeMinimumRole('STAFF'), assetController.getInventory);

// Create Asset (Admin/MD/Director)
router.post('/', authenticate, requirePermission(Permission.ASSET_MANAGE), validate(AssetSchema), assetController.createAsset);

// Assign Asset (Admin/MD/Director)
router.post('/assign', authenticate, requirePermission(Permission.ASSET_MANAGE), validate(AssetAssignSchema), assetController.assignAsset);

// Return Asset (Admin/MD/Director)
router.post('/return', authenticate, requirePermission(Permission.ASSET_MANAGE), assetController.returnAsset);

// Delete Asset (Admin/MD/Director)
router.delete('/:id', authenticate, requirePermission(Permission.ASSET_MANAGE), assetController.deleteAsset);

export default router;
