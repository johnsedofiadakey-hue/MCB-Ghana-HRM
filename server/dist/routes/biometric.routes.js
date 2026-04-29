"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const biometric_controller_1 = require("../controllers/biometric.controller");
const router = (0, express_1.Router)();
/**
 * Biometric Device Gateway
 * Secured via Sync Key validation in controller
 */
router.post('/push', biometric_controller_1.pushBiometricLogs);
exports.default = router;
