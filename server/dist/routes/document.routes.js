"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers/document.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/employee/:id', document_controller_1.getEmployeeDocuments);
router.post('/employee/:id', document_controller_1.uploadDocument);
router.delete('/:id', document_controller_1.deleteDocument);
// Digital Document Signing Endpoint
router.post('/:id/sign', document_controller_1.signDocument);
exports.default = router;
