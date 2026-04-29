"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInboxActions = void 0;
const inbox_service_1 = require("../services/inbox.service");
const enterprise_controller_1 = require("./enterprise.controller");
const getInboxActions = async (req, res) => {
    try {
        const organizationId = (0, enterprise_controller_1.getOrgId)(req) || 'mcb-ghana-tenant';
        const userId = req.user.id;
        const actions = await inbox_service_1.InboxService.getActions(organizationId, userId);
        return res.json(actions);
    }
    catch (error) {
        console.error('Inbox Controller Error:', error);
        return res.status(500).json({ error: 'Failed to fetch action inbox' });
    }
};
exports.getInboxActions = getInboxActions;
