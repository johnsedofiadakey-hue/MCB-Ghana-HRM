"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnouncement = exports.listAnnouncements = exports.createAnnouncement = void 0;
const announcement_service_1 = require("../services/announcement.service");
const getOrgId = (req) => req.user?.organizationId || 'mcb-ghana-tenant';
const createAnnouncement = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const announcement = await announcement_service_1.AnnouncementService.create(orgId, userId, req.body);
        return res.status(201).json(announcement);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createAnnouncement = createAnnouncement;
const listAnnouncements = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const announcements = await announcement_service_1.AnnouncementService.listForUser(orgId, userId);
        return res.json(announcements);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listAnnouncements = listAnnouncements;
const deleteAnnouncement = async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const userId = req.user.id;
        const role = req.user.role;
        const { id } = req.params;
        await announcement_service_1.AnnouncementService.delete(id, orgId, userId, role);
        return res.json({ success: true, message: 'Announcement deleted' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.deleteAnnouncement = deleteAnnouncement;
