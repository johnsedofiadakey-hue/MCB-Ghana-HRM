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
const router = (0, express_1.Router)();
// Employee endpoints
router.post('/tickets', auth_middleware_1.authenticate, supportController.createTicket);
router.get('/my', auth_middleware_1.authenticate, supportController.getMyTickets); // Alias for frontend
router.get('/my-tickets', auth_middleware_1.authenticate, supportController.getMyTickets);
router.get('/tickets/:id', auth_middleware_1.authenticate, supportController.getTicketDetails);
router.post('/tickets/:ticketId/comments', auth_middleware_1.authenticate, supportController.addComment); // Param alignment
// Admin / IT endpoints (Rank 85+ for IT Admin, MD, HR Manager)
router.get('/all', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), supportController.getAllTickets);
router.get('/all-tickets', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), supportController.getAllTickets);
router.patch('/tickets/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), supportController.updateTicketStatus); // Alias for frontend
router.patch('/tickets/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(85), supportController.updateTicketStatus);
// Lead Management (NOC & Public)
router.post('/leads', supportController.createLead);
router.get('/leads', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)(90), supportController.getLeads);
exports.default = router;
