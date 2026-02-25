const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies JWT Bearer token from Authorization header.
 * Attaches the full user document to req.user.
 */
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found.' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token.' });
        }
        next(error);
    }
};

/**
 * Generates a signed JWT for the given user.
 */
const signToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role,
            membershipStatus: user.membershipStatus,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

module.exports = { requireAuth, signToken };
