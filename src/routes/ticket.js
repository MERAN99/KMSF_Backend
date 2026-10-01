const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const {
    checkoutTicket,
    claimFreeTicket,
    getUserTickets,
    getEventTicketsAdmin,
    recoverTicketFromStripe,
    recoverAllMissingTickets,
    verifyTicketSession
} = require('../controllers/ticketController');

// User routes
router.post('/events/:id/tickets/checkout', requireAuth, checkoutTicket);
router.post('/events/:id/tickets/free', requireAuth, claimFreeTicket);
router.get('/users/me/tickets', requireAuth, getUserTickets);
router.post('/tickets/verify-session', requireAuth, verifyTicketSession);

// Admin routes
router.get('/admin/events/:id/tickets', requireAuth, requireAdmin, getEventTicketsAdmin);
router.post('/admin/tickets/recover', requireAuth, requireAdmin, recoverTicketFromStripe);
router.post('/admin/tickets/recover-all', requireAuth, requireAdmin, recoverAllMissingTickets);

module.exports = router;

