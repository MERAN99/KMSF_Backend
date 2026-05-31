const express = require('express');
const router = express.Router();
const {
    getMembers,
    getMember,
    createMember,
    updateMember,
    updateStatus,
    deleteMember,
    resetPassword,
    regenerateMemberId,
    toggleBlockMember,
    sendBulkRegistrationReminder,
} = require('../controllers/adminController');
const {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    notifyMembers
} = require('../controllers/eventController');
const {
    sendAnnouncement,
    getAnnouncements,
} = require('../controllers/announcementController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { upload, teamUpload } = require('../middleware/upload');
const { validateAnnouncement, validateCreateMember, validateUpdateMember } = require('../middleware/validate');

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// ─── Member CRUD & Stats ──────────────────────────────────────────────────────
router.get('/stats', require('../controllers/adminStatsController').getAdminStats);
router.get('/members', getMembers);
router.get('/member/:id', getMember);
router.post('/member', validateCreateMember, createMember);
router.put('/member/:id', validateUpdateMember, updateMember);  // H5: validates + blocks role escalation
router.patch('/member/:id/status', updateStatus);
router.delete('/member/:id', deleteMember);

// ─── Admin Extras ─────────────────────────────────────────────────────────────
router.post('/member/bulk-email', sendBulkRegistrationReminder);
router.patch('/member/:id/reset-password', resetPassword);
router.patch('/member/:id/regenerate-member-id', regenerateMemberId);
router.patch('/member/:id/toggle-block', toggleBlockMember);

// ─── Event Management ─────────────────────────────────────────────────────────
router.get('/events', getEvents);
router.post('/event', upload.fields([{ name: 'images', maxCount: 3 }, { name: 'galleryImages', maxCount: 1000 }]), createEvent);
router.put('/event/:id', upload.fields([{ name: 'images', maxCount: 3 }, { name: 'galleryImages', maxCount: 1000 }]), updateEvent);
router.delete('/event/:id', deleteEvent);
router.post('/event/:id/notify', notifyMembers);

// ─── Announcements ────────────────────────────────────────────────────────────
router.post('/announcement', validateAnnouncement, sendAnnouncement);
router.get('/announcements', getAnnouncements);

// ─── Team Member Management ──────────────────────────────────────────────────
const { createTeamMember, deleteTeamMember, updateTeamMember } = require('../controllers/teamMemberController');
router.post('/team-member', teamUpload.fields([{ name: 'image', maxCount: 1 }]), createTeamMember);
router.put('/team-member/:id', teamUpload.fields([{ name: 'image', maxCount: 1 }]), updateTeamMember);
router.delete('/team-member/:id', deleteTeamMember);

module.exports = router;
