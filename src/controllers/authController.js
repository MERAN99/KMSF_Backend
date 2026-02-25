const bcrypt = require('bcryptjs');
const { findByEmail } = require('../services/userService');
const { signToken } = require('../middleware/auth');


// ─── POST /login ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Include password field (hidden by default)
        const user = await findByEmail(email);
        if (!user) {
            return res.status(404).json({ success: false, message: 'No membership found.' });
        }

        if (user.membershipStatus === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Membership expired. Please renew your plan.',
            });
        }


        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = signToken(user);

        res.status(200).json({
            success: true,
            message: 'Login successful.',
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


// ─── POST /request-verification ──────────────────────────────────────────────
const requestVerification = async (req, res, next) => {
    try {
        const { email } = req.body;

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store in DB (update if exists)
        const VerificationToken = require('../models/VerificationToken');
        await VerificationToken.findOneAndUpdate(
            { email: email.toLowerCase() },
            { code, expiresAt, verified: false },
            { upsert: true, new: true }
        );

        // Send email
        const { sendOTPEmail } = require('../services/emailService');
        await sendOTPEmail(email, code);

        res.status(200).json({
            success: true,
            message: 'Verification code sent to your email.',
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /confirm-verification ──────────────────────────────────────────────
const confirmVerification = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        const VerificationToken = require('../models/VerificationToken');
        const token = await VerificationToken.findOne({
            email: email.toLowerCase(),
            code,
            expiresAt: { $gt: new Date() },
        });

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code.',
            });
        }

        // Mark as verified
        token.verified = true;
        await token.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully.',
        });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /change-password ──────────────────────────────────────────────
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const User = require('../models/User');
        const user = await User.findById(userId).select('+password');

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully.',
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /forgot-password ──────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await findByEmail(email);

        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const VerificationToken = require('../models/VerificationToken');
        await VerificationToken.findOneAndUpdate(
            { email: email.toLowerCase() },
            { code, expiresAt, verified: false },
            { upsert: true, new: true }
        );

        const { sendOTPEmail } = require('../services/emailService');
        await sendOTPEmail(email, code);

        res.status(200).json({
            success: true,
            message: 'A reset code has been sent to your email.',
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /verify-reset-code ─────────────────────────────────────────────
const verifyResetCode = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        const VerificationToken = require('../models/VerificationToken');
        const token = await VerificationToken.findOne({
            email: email.toLowerCase(),
            code: String(code), // Strict string check
            expiresAt: { $gt: new Date() },
        });

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code.',
            });
        }

        // Mark as verified so resetPassword can proceed
        token.verified = true;
        await token.save();

        res.status(200).json({
            success: true,
            message: 'Code verified. You can now reset your password.',
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /reset-password ──────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;

        const VerificationToken = require('../models/VerificationToken');
        // Token MUST be verified recently
        const token = await VerificationToken.findOne({
            email: email.toLowerCase(),
            code: String(code),
            verified: true,
            expiresAt: { $gt: new Date() },
        });

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Code verification required or code expired.',
            });
        }

        const User = require('../models/User');
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        user.password = hashedPassword;
        await user.save();

        // Delete the token after use
        await VerificationToken.deleteOne({ _id: token._id });

        res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, requestVerification, confirmVerification, changePassword, forgotPassword, verifyResetCode, resetPassword };
