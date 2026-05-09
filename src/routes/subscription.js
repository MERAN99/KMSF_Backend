const express = require('express');
const router = express.Router();
const {
    startSubscription,
    renewSubscription,
    verifySession,
    cancelSubscription,
} = require('../controllers/subscriptionController');
const { validateStartSubscription } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');

// POST /start-subscription — must be authenticated (registered user upgrading to paid)
router.post('/start-subscription', requireAuth, startSubscription);

// POST /verify-session — public (confirm payment on redirect)
router.post('/verify-session', verifySession);

// POST /renew-subscription — must be authenticated (inactive member)
router.post('/renew-subscription', requireAuth, renewSubscription);

// POST /cancel-subscription — must be authenticated
router.post('/cancel-subscription', requireAuth, cancelSubscription);

module.exports = router;
