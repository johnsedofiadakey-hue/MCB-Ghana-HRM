import { Router } from 'express';
import * as supportController from '../controllers/support.controller';
import { authenticate, requireRole, requireAnyPermission } from '../middleware/auth.middleware';
import { Permission } from '../types/permissions';
import { RoleRank } from '../types/roles';

const router = Router();

// Employee endpoints
router.post('/tickets', authenticate, supportController.createTicket);
router.get('/my', authenticate, supportController.getMyTickets); // Alias for frontend
router.get('/my-tickets', authenticate, supportController.getMyTickets);
router.get('/tickets/:id', authenticate, supportController.getTicketDetails);
router.post('/tickets/:ticketId/comments', authenticate, supportController.addComment); // Param alignment
router.post('/tickets/:id/reopen', authenticate, supportController.reopenTicket);
router.post('/tickets/:id/attach', authenticate, supportController.attachTicketFile);
router.get('/knowledge', authenticate, supportController.listKnowledgeArticles);

// Admin / IT endpoints (Rank 85+ for IT Admin, MD, HR Manager)
const queuePermissions = [Permission.HELPDESK_IT, Permission.HELPDESK_HR, Permission.HELPDESK_FINANCE, Permission.HELPDESK_MARKETING, Permission.HELPDESK_FACILITIES, Permission.HELPDESK_OTHER];
router.get('/all', authenticate, requireAnyPermission(queuePermissions), supportController.getAllTickets);
router.get('/all-tickets', authenticate, requireAnyPermission(queuePermissions), supportController.getAllTickets);
router.get('/dashboard', authenticate, requireAnyPermission(queuePermissions), supportController.getQueueDashboard);
router.post('/knowledge', authenticate, requireAnyPermission(queuePermissions), supportController.createKnowledgeArticle);
router.patch('/tickets/:id/status', authenticate, requireAnyPermission(queuePermissions), supportController.updateTicketStatus);
router.patch('/tickets/:id', authenticate, requireAnyPermission(queuePermissions), supportController.updateTicketStatus);
router.patch('/tickets/:id/assign', authenticate, requireAnyPermission(queuePermissions), supportController.assignTicket);

// Lead Management (NOC & Public)
router.post('/leads', supportController.createLead);
router.get('/leads', authenticate, requireRole(90), supportController.getLeads);

export default router;
