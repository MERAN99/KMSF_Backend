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
const upload = require('../middleware/upload');
const { validateAnnouncement, validateCreateMember } = require('../middleware/validate');

// All admin routes require authentication + admin role
router.use(requireAuth, requireAdmin);

// ─── Member CRUD & Stats ──────────────────────────────────────────────────────
router.get('/stats', require('../controllers/adminStatsController').getAdminStats);
router.get('/members', getMembers);
router.get('/member/:id', getMember);
router.post('/member', validateCreateMember, createMember);
router.put('/member/:id', updateMember);
router.patch('/member/:id/status', updateStatus);
router.delete('/member/:id', deleteMember);

// ─── Admin Extras ─────────────────────────────────────────────────────────────
router.patch('/member/:id/reset-password', resetPassword);
router.patch('/member/:id/regenerate-member-id', regenerateMemberId);
router.patch('/member/:id/toggle-block', toggleBlockMember);

// ─── Event Management ─────────────────────────────────────────────────────────
router.get('/events', getEvents);
router.post('/event', upload.single('image'), createEvent);
router.put('/event/:id', upload.single('image'), updateEvent);
router.delete('/event/:id', deleteEvent);
router.post('/event/:id/notify', notifyMembers);

// ─── Announcements ────────────────────────────────────────────────────────────
router.post('/announcement', validateAnnouncement, sendAnnouncement);
router.get('/announcements', getAnnouncements);

module.exports = router;
