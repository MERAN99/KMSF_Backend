const express = require('express');
const router = express.Router();
const { getSubscriptionStatus } = require('../controllers/subscriptionController');
const { requireAuth } = require('../middleware/auth');
const { requireMember } = require('../middleware/requireMember');

// GET /member/subscription-status — active members only
router.get('/member/subscription-status', requireAuth, requireMember, getSubscriptionStatus);

module.exports = router;
