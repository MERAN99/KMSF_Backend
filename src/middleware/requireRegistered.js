/**
 * Requires the user to be at least a "registered" free tier user.
 * Allows membershipStatus of 'registered' OR 'active'.
 * Blocks access for 'inactive' users (expired paid memberships).
 */
const requireRegistered = (req, res, next) => {
    const user = req.user;

    if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (user.isBlocked) {
        return res.status(403).json({ success: false, message: 'Your account has been blocked.' });
    }

    const allowed = ['registered', 'active'];
    if (!allowed.includes(user.membershipStatus)) {
        return res.status(403).json({
            success: false,
            message: 'This area requires at least a free registered account.',
        });
    }

    next();
};

module.exports = { requireRegistered };
