/**
 * Checks that the authenticated user has the "admin" role.
 * Must be used after requireAuth.
 */
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.',
        });
    }
    next();
};

module.exports = { requireAdmin };
