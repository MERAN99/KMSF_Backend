const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { findByEmail } = require('../services/userService');
const { signToken } = require('../middleware/auth');
const { generateMemberId } = require('../utils/memberId');
const { welcomeEmailTemplate } = require('../utils/emailTemplates');
const { sendEmail } = require('../services/emailService');


// ─── POST /login ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Use generic error for non-existent users to prevent user enumeration
        const user = await findByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked by an administrator. Please contact support.',
            });
        }

        if (user.role !== 'admin' && user.membershipStatus === 'inactive') {
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
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
        }
        // Validate new password strength server-side
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.' });
        }
        const User = require('../models/User');
        const userId = req.user.id;
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

        // Return generic success even when email not found (prevents user enumeration)
        if (!user) {
            return res.status(200).json({ success: true, message: 'A reset code has been sent to your email.' });
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

// ─── POST /register ───────────────────────────────────────────────────────────
const register = async (req, res, next) => {
    try {
        const {
            title, firstName, lastName, gender, organization,
            email, password, profession, speciality, telephone,
            addressLine1, addressLine2, city, countyRegion, country, postCode,
        } = req.body;

        // Check for duplicate email
        const existing = await findByEmail(email);
        if (existing) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const memberId = await generateMemberId();

        // Use profession as the speciality value (frontend may send either or both)
        const resolvedSpeciality = speciality || profession || '';

        const user = new User({
            title, firstName, lastName, gender, organization,
            profession,
            email: email.toLowerCase(),
            password: hashedPassword,
            speciality: resolvedSpeciality, telephone,
            addressLine1, addressLine2, city, countyRegion, country, postCode,
            role: 'member',
            membershipStatus: 'registered',
            memberId,
        });

        await user.save();

        // Send a welcome email (non-blocking)
        try {
            const { subject, html } = welcomeEmailTemplate(user);
            await sendEmail(user.email, subject, html);
        } catch (emailErr) {
            console.warn('Welcome email failed (non-fatal):', emailErr.message);
        }

        const token = signToken(user);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            token,
            user: {
                id: user._id,
                memberId: user.memberId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                membershipStatus: user.membershipStatus,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /profile ──────────────────────────────────────────────────────────
const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                memberId: user.memberId,
                title: user.title,
                firstName: user.firstName,
                lastName: user.lastName,
                gender: user.gender,
                organization: user.organization,
                profession: user.profession,
                speciality: user.speciality,
                email: user.email,
                addressLine1: user.addressLine1,
                addressLine2: user.addressLine2,
                city: user.city,
                countyRegion: user.countyRegion,
                country: user.country,
                postCode: user.postCode,
                role: user.role,
                membershipStatus: user.membershipStatus,
                subscriptionEndDate: user.subscriptionEndDate,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /update-profile ────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
    try {
        const allowedFields = [
            'title', 'firstName', 'lastName', 'gender',
            'organization', 'profession', 'speciality', 'telephone',
            'addressLine1', 'addressLine2', 'city', 'countyRegion', 'country', 'postCode',
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                id: user._id,
                memberId: user.memberId,
                title: user.title,
                firstName: user.firstName,
                lastName: user.lastName,
                gender: user.gender,
                organization: user.organization,
                profession: user.profession,
                speciality: user.speciality,
                telephone: user.telephone,
                email: user.email,
                addressLine1: user.addressLine1,
                addressLine2: user.addressLine2,
                city: user.city,
                countyRegion: user.countyRegion,
                country: user.country,
                postCode: user.postCode,
                role: user.role,
                membershipStatus: user.membershipStatus,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /request-email-change ───────────────────────────────────────────────
const requestEmailChange = async (req, res, next) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail) return res.status(400).json({ success: false, message: 'New email is required.' });

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        // Check if email is already taken
        const existing = await User.findOne({ email: newEmail.toLowerCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: 'This email is already in use.' });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const VerificationToken = require('../models/VerificationToken');
        await VerificationToken.findOneAndUpdate(
            { email: newEmail.toLowerCase() },
            { code, expiresAt, verified: false },
            { upsert: true, new: true }
        );

        const { sendOTPEmail } = require('../services/emailService');
        await sendOTPEmail(newEmail, code);

        res.status(200).json({
            success: true,
            message: 'Verification code sent to your new email address.',
        });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /confirm-email-change ─────────────────────────────────────────────
const confirmEmailChange = async (req, res, next) => {
    try {
        const { newEmail, code } = req.body;
        if (!newEmail || !code) {
            return res.status(400).json({ success: false, message: 'New email and code are required.' });
        }

        const VerificationToken = require('../models/VerificationToken');
        const token = await VerificationToken.findOne({
            email: newEmail.toLowerCase(),
            code: String(code),
            expiresAt: { $gt: new Date() },
        });

        if (!token) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { email: newEmail.toLowerCase() } },
            { new: true }
        );

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        await VerificationToken.deleteOne({ _id: token._id });

        res.status(200).json({
            success: true,
            message: 'Email updated successfully.',
            user: {
                id: user._id,
                memberId: user.memberId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                membershipStatus: user.membershipStatus,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { login, requestVerification, confirmVerification, changePassword, forgotPassword, verifyResetCode, resetPassword, register, getProfile, updateProfile, requestEmailChange, confirmEmailChange };

