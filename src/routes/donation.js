const express = require('express');
const { createDonationSession, confirmDonation, getAdminDonations } = require('../controllers/donationController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/requireAdmin');

const router = express.Router();

// Public route for creating a donation session (supports both logged in and guest users)
router.post('/create-session', function (req, res, next) {
    // We optionally use protect middleware manually here so we don't block guests, 
    // but we still want req.user if they are logged in.
    const optionalAuth = (req, res, next) => {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer')) {
            return next();
        }
        // Run standard requireAuth middleware to safely attach req.user if token valid
        return requireAuth(req, res, (err) => {
            if (err) return next(); // Ignore auth errors for guests
            next();
        });
    };

    optionalAuth(req, res, () => {
        createDonationSession(req, res, next);
    });
});

// Admin ONLY route to get donations list
router.get('/admin', requireAuth, requireAdmin, getAdminDonations);

// Public route to confirm a completed donation by session ID (called by frontend on success redirect)
router.post('/confirm', confirmDonation);

module.exports = router;
