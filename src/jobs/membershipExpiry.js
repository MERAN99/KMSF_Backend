const User = require('../models/User');
const stripe = require('../config/stripe');
const { syncAllActiveStripeSubscriptions } = require('../services/stripeSyncService');

/**
 * Checks for expired memberships and safely updates their status to 'registered'.
 *
 * Steps:
 * 1. Sync all active Stripe subscriptions to ensure no paying member is accidentally expired.
 * 2. Find any remaining 'active' users whose subscriptionEndDate is in the past.
 * 3. Verify they don't have an active Stripe subscription before marking them as 'registered'.
 */
const deactivateExpiredMemberships = async () => {
    try {
        console.log('[MembershipExpiry] Running membership expiry check...');

        // 1. Sync with Stripe first
        await syncAllActiveStripeSubscriptions();

        // 2. Find users who are marked 'active' but subscriptionEndDate has passed
        const now = new Date();
        const potentiallyExpiredUsers = await User.find({
            membershipStatus: 'active',
            subscriptionEndDate: { $lt: now, $ne: null },
            role: { $ne: 'admin' }, // Never expire admins
        });

        let deactivatedCount = 0;

        for (const user of potentiallyExpiredUsers) {
            let isStillActiveOnStripe = false;

            // If user has a Stripe subscription ID, check its real status in Stripe
            if (user.stripeSubscriptionId) {
                try {
                    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
                    if (sub && sub.status === 'active') {
                        isStillActiveOnStripe = true;
                        user.subscriptionEndDate = new Date(sub.current_period_end * 1000);
                        await user.save();
                        console.log(`[MembershipExpiry] Saved active renewal from Stripe for: ${user.email}`);
                    }
                } catch (err) {
                    // Subscription not found in Stripe or error
                }
            }

            if (!isStillActiveOnStripe) {
                user.membershipStatus = 'registered';
                user.stripeSubscriptionId = undefined; // clear cancelled subscription ID
                await user.save();
                deactivatedCount++;
                console.log(`[MembershipExpiry] Expired membership deactivated for: ${user.email}`);
            }
        }

        if (deactivatedCount > 0) {
            console.log(`[MembershipExpiry] Successfully deactivated ${deactivatedCount} expired non-paying/gifted membership(s).`);
        } else {
            console.log('[MembershipExpiry] No expired memberships needed deactivation.');
        }
    } catch (error) {
        console.error('[MembershipExpiry] Error during expiry check:', error.message);
    }
};

/**
 * Starts the membership expiry and sync scheduler.
 * Runs immediately on startup, then every hour.
 */
const startMembershipExpiryJob = () => {
    console.log('[MembershipExpiry] Starting membership expiry scheduler (runs every hour).');

    // Run immediately on server boot
    deactivateExpiredMemberships();

    // Run every hour
    setInterval(deactivateExpiredMemberships, 60 * 60 * 1000);
};

module.exports = {
    startMembershipExpiryJob,
    deactivateExpiredMemberships,
};
