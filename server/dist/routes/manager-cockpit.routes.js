"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const manager_cockpit_controller_1 = require("../controllers/manager-cockpit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Contract fix for client
router.get('/cockpit/health', (req, res) => {
    res.json({ status: "OK", features: ["cockpit", "org-intelligence"] });
});
router.get('/cockpit', manager_cockpit_controller_1.ManagerCockpitController.getCockpitData);
router.get('/org-intelligence', manager_cockpit_controller_1.ManagerCockpitController.getOrgIntelligence);
exports.default = router;
