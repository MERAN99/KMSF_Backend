const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const {
    checkoutTicket,
    claimFreeTicket,
    getUserTickets,
    getEventTicketsAdmin
} = require('../controllers/ticketController');

// User routes
router.post('/events/:id/tickets/checkout', requireAuth, checkoutTicket);
router.post('/events/:id/tickets/free', requireAuth, claimFreeTicket);
router.get('/users/me/tickets', requireAuth, getUserTickets);

// Admin routes
router.get('/admin/events/:id/tickets', requireAuth, requireAdmin, getEventTicketsAdmin);

module.exports = router;
