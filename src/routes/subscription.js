const express = require('express');
const router = express.Router();
const {
    startSubscription,
    renewSubscription,
    verifySession,
} = require('../controllers/subscriptionController');
const { validateStartSubscription } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// POST /start-subscription — public (no auth required before payment)
router.post('/start-subscription', validateStartSubscription, startSubscription);

// POST /verify-session — public (confirm payment on redirect)
router.post('/verify-session', verifySession);

// POST /renew-subscription — must be authenticated (inactive member)
router.post('/renew-subscription', requireAuth, renewSubscription);

module.exports = router;
