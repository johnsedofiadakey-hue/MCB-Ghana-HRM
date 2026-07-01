"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supportController = __importStar(require("../controllers/support.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permissions_1 = require("../types/permissions");
const router = (0, express_1.Router)();
// Employee endpoints
router.post('/tickets', auth_middleware_1.authenticate, supportController.createTicket);
router.get('/my', auth_middleware_1.authenticate, supportController.getMyTickets); // Alias for frontend
router.get('/my-tickets', auth_middleware_1.authenticate, supportController.getMyTickets);
router.get('/tickets/:id', auth_middleware_1.authenticate, supportController.getTicketDetails);
router.post('/tickets/:ticketId/comments', auth_middleware_1.authenticate, supportController.addComment); // Param alignment
router.post('/tickets/:id/reopen', auth_middleware_1.authenticate, supportController.reopenTicket);
router.post('/tickets/:id/attach', auth_middleware_1.authenticate, supportController.attachTicketFile);
router.get('/knowledge', auth_middleware_1.authenticate, supportController.listKnowledgeArticles);
// Admin / IT endpoints (Rank 85+ for IT Admin, MD, HR Manager)
const queuePermissions = [permissions_1.Permission.HELPDESK_IT, permissions_1.Permission.HELPDESK_HR, permissions_1.Permission.HELPDESK_FINANCE, permissions_1.Permission.HELPDESK_MARKETING, permissions_1.Permission.HELPDESK_FACILITIES, permissions_1.Permission.HELPDESK_OTHER];
router.get('/all', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.getAllTickets);
router.get('/all-tickets', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.getAllTickets);
router.get('/dashboard', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.getQueueDashboard);
router.post('/knowledge', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.createKnowledgeArticle);
router.patch('/tickets/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.updateTicketStatus);
router.patch('/tickets/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.updateTicketStatus);
router.patch('/tickets/:id/assign', auth_middleware_1.authenticate, (0, auth_middleware_1.requireAnyPermission)(queuePermissions), supportController.assignTicket);
// Lead Management (NOC & Public)
router.post('/leads', supportController.createLead);
router.get('/leads', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(90), supportController.getLeads);
exports.default = router;
