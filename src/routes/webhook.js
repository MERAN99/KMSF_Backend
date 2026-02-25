const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');

// POST /webhook — raw body is required for Stripe signature verification
// express.raw() is applied at the app level for this route before express.json()
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
