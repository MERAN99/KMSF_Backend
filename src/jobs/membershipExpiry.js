const User = require('../models/User');

/**
 * Scans for users whose membershipStatus is 'active' but whose
 * subscriptionEndDate has passed, and sets them to 'registered'.
 *
 * This handles:
 *  - Admin-gifted memberships with a custom duration
 *  - Any edge-case where webhooks didn't fire (e.g. Stripe outage)
 */
const deactivateExpiredMemberships = async () => {
    try {
        const now = new Date();

        const result = await User.updateMany(
            {
                membershipStatus: 'active',
                subscriptionEndDate: { $lt: now, $ne: null },
                role: { $ne: 'admin' }, // Never expire admins
            },
            {
                $set: {
                    membershipStatus: 'registered',
                },
                $unset: {
                    stripeSubscriptionId: '',
                },
            }
        );

        if (result.modifiedCount > 0) {
            console.log(`[MembershipExpiry] Deactivated ${result.modifiedCount} expired membership(s).`);
        }
    } catch (error) {
        console.error('[MembershipExpiry] Error checking expired memberships:', error.message);
    }
};

/**
 * Starts the membership expiry checker.
 * Runs immediately on startup, then every hour.
 */
const startMembershipExpiryJob = () => {
    console.log('[MembershipExpiry] Starting membership expiry checker (runs every hour).');

    // Run immediately on startup
    deactivateExpiredMemberships();

    // Then run every hour (3600000 ms)
    setInterval(deactivateExpiredMemberships, 60 * 60 * 1000);
};

module.exports = { startMembershipExpiryJob, deactivateExpiredMemberships };
