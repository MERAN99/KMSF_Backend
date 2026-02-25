const bcrypt = require('bcryptjs');
const { createCheckoutSession, createBillingPortalSession, createRenewalCheckoutSession } = require('../services/stripeService');
const { findByEmail } = require('../services/userService');
const { getRemainingDays } = require('../utils/subscriptionDays');
const User = require('../models/User');

// ─── POST /start-subscription ─────────────────────────────────────────────────
const startSubscription = async (req, res, next) => {
    try {
        const {
            title, firstName, lastName, gender, organization,
            email, password, speciality, branch, telephone, address,
        } = req.body;

        const hashedPassword = password ? await bcrypt.hash(password, 12) : '';

        const profileData = {
            title, firstName, lastName, gender, organization,
            email: email.toLowerCase(),
            hashedPassword,
            speciality, branch, telephone, address,
        };

        const session = await createCheckoutSession(profileData);

        res.status(200).json({
            success: true,
            message: 'Checkout session created. Redirect user to the provided URL.',
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /renew-subscription ─────────────────────────────────────────────────
const renewSubscription = async (req, res, next) => {
    try {
        const user = req.user;

        // Only inactive users can renew
        if (user.membershipStatus === 'active') {
            return res.status(400).json({
                success: false,
                message: 'Your membership is already active.',
            });
        }

        // Prefer Stripe Billing Portal if customer exists
        if (user.stripeCustomerId) {
            try {
                const portalSession = await createBillingPortalSession(user.stripeCustomerId);
                return res.status(200).json({
                    success: true,
                    message: 'Billing portal session created.',
                    url: portalSession.url,
                });
            } catch (portalError) {
                console.warn('Billing portal failed, falling back to checkout:', portalError.message);
            }
        }

        // Fallback: new checkout session
        const session = await createRenewalCheckoutSession(
            user.stripeCustomerId,
            user.email
        );

        res.status(200).json({
            success: true,
            message: 'Renewal checkout session created.',
            url: session.url,
            sessionId: session.id,
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /member/subscription-status ──────────────────────────────────────────
const getSubscriptionStatus = async (req, res, next) => {
    try {
        const user = req.user;
        const remainingDays = getRemainingDays(user.subscriptionEndDate);

        // Auto-deactivate if days ran out (belt-and-suspenders alongside requireMember)
        let membershipStatus = user.membershipStatus;
        if (remainingDays <= 0 && membershipStatus === 'active') {
            await User.findByIdAndUpdate(user._id, { membershipStatus: 'inactive' });
            membershipStatus = 'inactive';
        }

        res.status(200).json({
            success: true,
            data: {
                membershipStatus,
                subscriptionEndDate: user.subscriptionEndDate,
                remainingDays,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /verify-session ──────────────────────────────────────────────────
const verifySession = async (req, res, next) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required.' });
        }

        const stripe = require('../config/stripe');
        const { createUserFromWebhook } = require('../services/userService');

        // 1. Retrieve the session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // 2. check if payment is successful
        if (session.payment_status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Payment not completed.' });
        }

        // 3. Extract metadata and fulfillment info
        const { metadata, customer, subscription } = session;
        if (!metadata || !metadata.email) {
            return res.status(400).json({ success: false, message: 'Invalid session metadata.' });
        }

        // 4. Get subscription dates
        const subscriptionObj = await stripe.subscriptions.retrieve(subscription);
        const subscriptionStartDate = new Date(subscriptionObj.current_period_start * 1000);
        const subscriptionEndDate = new Date(subscriptionObj.current_period_end * 1000);

        // 5. Fulfillment (Create user if doesn't exist)
        const user = await createUserFromWebhook({
            metadata,
            stripeCustomerId: customer,
            stripeSubscriptionId: subscription,
            subscriptionStartDate,
            subscriptionEndDate,
        });

        // 6. Sign token and return user info (similar to login)
        const { signToken } = require('../middleware/auth');
        const token = signToken(user);

        res.status(200).json({
            success: true,
            message: 'Session verified and account fulfilled.',
            token,
            user: {
                id: user._id,
                memberId: user.memberId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                membershipStatus: user.membershipStatus,
                subscriptionEndDate: user.subscriptionEndDate,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { startSubscription, renewSubscription, getSubscriptionStatus, verifySession };
