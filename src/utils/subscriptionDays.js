/**
 * Calculate remaining days on a subscription.
 * Returns a negative number if subscription is expired.
 */
const getRemainingDays = (subscriptionEndDate) => {
    if (!subscriptionEndDate) return 0;
    return Math.ceil(
        (new Date(subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
};

module.exports = { getRemainingDays };
