const { createDonationCheckoutSession } = require('../services/stripeService');
const Donation = require('../models/Donation');
const stripe = require('../config/stripe');

/**
 * Creates a Stripe Checkout Session for a one-time donation.
 */
const createDonationSession = async (req, res, next) => {
    try {
        const { amount, currency, isAnonymous, message } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid donation amount.' });
        }

        let userId = null;
        let donorName = 'Anonymous';

        // If user is logged in AND not donating anonymously, use their name
        if (req.user && !isAnonymous) {
            userId = req.user._id;
            donorName = `${req.user.firstName} ${req.user.lastName}`;
        }

        const session = await createDonationCheckoutSession(
            amount,
            currency || 'GBP',
            userId,
            donorName,
            message || ''
        );

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
            message: session.metadata?.message || '',
        });

        console.log(`Donation confirmed and saved: ${donation.amount} ${donation.currency} from ${donation.donorName}`);

        res.status(200).json({ success: true, message: 'Donation recorded successfully.', data: donation });
    } catch (error) {
        console.error('Error confirming donation:', error);
        next(error);
    }
};

/**
 * Public: get donations that have a non-empty message
 * Returns only safe fields: donorName, message, createdAt
 */
const getDonationMessages = async (req, res, next) => {
    try {
        const messages = await Donation.find({
            paymentStatus: 'completed',
            message: { $exists: true, $ne: '' },
            showPublicly: true,   // Only admin-featured messages are shown publicly
        })
            .sort({ createdAt: -1 })
            .select('donorName message createdAt')
            .limit(50)
            .lean();

        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: toggle whether a donation message is shown publicly
 */
const toggleDonationMessage = async (req, res, next) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ success: false, message: 'Donation not found.' });
        }
        if (!donation.message) {
            return res.status(400).json({ success: false, message: 'This donation has no message.' });
        }
        donation.showPublicly = !donation.showPublicly;
        await donation.save();
        res.status(200).json({
            success: true,
            showPublicly: donation.showPublicly,
            message: donation.showPublicly ? 'Message is now featured publicly.' : 'Message hidden from public.',
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
    confirmDonation,
    getDonationMessages,
    toggleDonationMessage,
    getAdminDonations,
};
