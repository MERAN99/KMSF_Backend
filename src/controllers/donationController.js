const { createDonationCheckoutSession } = require('../services/stripeService');
const Donation = require('../models/Donation');

/**
 * Creates a Stripe Checkout Session for a one-time donation.
 */
const createDonationSession = async (req, res, next) => {
    try {
        const { amount, currency } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid donation amount.' });
        }

        // Check if user is logged in
        let userId = null;
        let donorName = 'Anonymous';

        if (req.user) {
            userId = req.user._id;
            donorName = `${req.user.firstName} ${req.user.lastName}`;
        }

        const session = await createDonationCheckoutSession(amount, currency || 'USD', userId, donorName);

        res.status(200).json({
            success: true,
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin view to get all successful donations
 */
const getAdminDonations = async (req, res, next) => {
    try {
        const donations = await Donation.find({ paymentStatus: 'completed' })
            .sort({ createdAt: -1 })
            .populate('userId', 'firstName lastName email');

        res.status(200).json({
            success: true,
            count: donations.length,
            data: donations,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createDonationSession,
    getAdminDonations,
};
