import { Router } from 'express';
import { ManagerCockpitController } from '../controllers/manager-cockpit.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Contract fix for client
router.get('/cockpit/health', (req, res) => {
  res.json({ status: "OK", features: ["cockpit", "org-intelligence"] });
});

router.get('/cockpit', ManagerCockpitController.getCockpitData);
router.get('/org-intelligence', ManagerCockpitController.getOrgIntelligence);

export default router;
