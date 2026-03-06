const { createDonationCheckoutSession } = require('../services/stripeService');
const Donation = require('../models/Donation');
const stripe = require('../config/stripe');

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
 * Confirms a completed donation by verifying the Stripe session directly.
 * Called by the frontend after Stripe redirects back on success.
 * This is a reliable alternative to webhooks.
 */
const confirmDonation = async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required.' });
        }

        // Retrieve session directly from Stripe to verify payment
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!session || session.payment_status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Payment not completed.' });
        }

        // Idempotency: check if this donation was already recorded
        const existing = await Donation.findOne({ stripeSessionId: session.id });
        if (existing) {
            return res.status(200).json({ success: true, message: 'Donation already recorded.', data: existing });
        }

        // Save donation to database
        const donation = await Donation.create({
            userId: session.metadata?.userId !== 'anonymous' ? session.metadata?.userId : null,
            donorName: session.metadata?.donorName || 'Anonymous',
            amount: session.amount_total / 100,
            currency: session.currency.toUpperCase(),
            stripeSessionId: session.id,
            paymentStatus: 'completed',
        });

        console.log(`Donation confirmed and saved: ${donation.amount} ${donation.currency} from ${donation.donorName}`);

        res.status(200).json({ success: true, message: 'Donation recorded successfully.', data: donation });
    } catch (error) {
        console.error('Error confirming donation:', error);
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
    confirmDonation,
    getAdminDonations,
};
