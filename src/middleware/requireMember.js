const User = require('../models/User');

/**
 * Checks that the authenticated user has an active membership
 * and that their subscriptionEndDate has not passed.
 * Auto-deactivates expired memberships in the DB.
 */
const requireMember = async (req, res, next) => {
    try {
        const user = req.user;

        const now = new Date();
        const isExpired = user.subscriptionEndDate && new Date(user.subscriptionEndDate) <= now;

        // Auto-deactivate if expired but still marked active
        if (isExpired && user.membershipStatus === 'active') {
            await User.findByIdAndUpdate(user._id, { membershipStatus: 'inactive' });
            return res.status(403).json({
                success: false,
                message: 'Membership has expired. Please renew your subscription.',
            });
        }

        if (user.membershipStatus !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Membership is inactive or expired. Please renew your subscription.',
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { requireMember };
