const stripe = require('../config/stripe');
const User = require('../models/User');

/**
 * Syncs all active subscriptions from Stripe directly into the MongoDB database.
 * This guarantees that any user paying on Stripe is marked as 'active' with the
 * accurate period end date, even if webhooks were delayed or missed.
 */
const syncAllActiveStripeSubscriptions = async () => {
    console.log('[StripeSync] Starting full sync of active Stripe subscriptions...');
    let hasMore = true;
    let startingAfter = undefined;
    let syncedCount = 0;
    let totalActiveInStripe = 0;
    let notFoundEmails = [];

    try {
        while (hasMore) {
            const listParams = {
                status: 'active',
                limit: 100,
                expand: ['data.customer'],
            };
            if (startingAfter) {
                listParams.starting_after = startingAfter;
            }

            const response = await stripe.subscriptions.list(listParams);

            for (const sub of response.data) {
                totalActiveInStripe++;
                const customer = sub.customer;
                const customerId = typeof customer === 'string' ? customer : customer?.id;
                const customerEmail = typeof customer === 'object' && customer?.email 
                    ? customer.email.toLowerCase().trim() 
                    : null;
                
                const subscriptionStartDate = new Date(sub.current_period_start * 1000);
                const subscriptionEndDate = new Date(sub.current_period_end * 1000);

                // Try to find the user in MongoDB
                let user = null;
                if (customerId) {
                    user = await User.findOne({ stripeCustomerId: customerId });
                }
                if (!user && sub.id) {
                    user = await User.findOne({ stripeSubscriptionId: sub.id });
                }
                if (!user && customerEmail) {
                    user = await User.findOne({ email: customerEmail });
                }

                if (user) {
                    user.membershipStatus = 'active';
                    user.stripeCustomerId = customerId;
                    user.stripeSubscriptionId = sub.id;
                    if (!user.subscriptionStartDate) {
                        user.subscriptionStartDate = subscriptionStartDate;
                    }
                    user.subscriptionEndDate = subscriptionEndDate;
                    await user.save();
                    syncedCount++;
                    console.log(`[StripeSync] Synced active user: ${user.email} (expires: ${subscriptionEndDate.toISOString().split('T')[0]})`);
                } else {
                    if (customerEmail) {
                        notFoundEmails.push(customerEmail);
                    }
                    console.warn(`[StripeSync] Active Stripe subscription customer (${customerEmail || customerId}) not found in KMSF database.`);
                }
            }

            hasMore = response.has_more;
            if (hasMore && response.data.length > 0) {
                startingAfter = response.data[response.data.length - 1].id;
            }
        }

        console.log(`[StripeSync] Finished sync. Total in Stripe: ${totalActiveInStripe}, Successfully synced in DB: ${syncedCount}, Unlinked: ${notFoundEmails.length}`);
        return {
            success: true,
            totalActiveInStripe,
            syncedCount,
            unlinkedCount: notFoundEmails.length,
            notFoundEmails,
        };
    } catch (error) {
        console.error('[StripeSync] Error during Stripe sync:', error.message);
        return {
            success: false,
            error: error.message,
        };
    }
};

module.exports = {
    syncAllActiveStripeSubscriptions,
};
