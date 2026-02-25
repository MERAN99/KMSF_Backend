const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateMemberId } = require('../utils/memberId');
const { getRemainingDays } = require('../utils/subscriptionDays');

// ─── GET /admin/members ───────────────────────────────────────────────────────
const getMembers = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            role,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        const filter = { role: { $ne: 'admin' } };
        if (status) filter.membershipStatus = status;
        if (role) filter.role = role;
        if (search) {
            filter.$and = [
                { role: { $ne: 'admin' } },
                {
                    $or: [
                        { firstName: { $regex: search, $options: 'i' } },
                        { lastName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { memberId: { $regex: search, $options: 'i' } },
                        { organization: { $regex: search, $options: 'i' } },
                    ]
                }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [members, total] = await Promise.all([
            User.find(filter).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
            User.countDocuments(filter),
        ]);

        // Append remainingDays to each member
        const enriched = members.map((m) => ({
            ...m,
            remainingDays: getRemainingDays(m.subscriptionEndDate),
        }));

        res.status(200).json({
            success: true,
            data: enriched,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /admin/member/:id ────────────────────────────────────────────────────
const getMember = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).lean();
        if (!user || user.role === 'admin') {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }
        res.status(200).json({
            success: true,
            data: { ...user, remainingDays: getRemainingDays(user.subscriptionEndDate) },
        });
    } catch (error) {
        next(error);
    }
};

// ─── POST /admin/member ────────────────────────────────────────────────────────
const createMember = async (req, res, next) => {
    try {
        const {
            title, firstName, lastName, gender, organization,
            email, password, speciality, branch, telephone, address,
            role, membershipStatus, subscriptionEndDate,
        } = req.body;

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already in use.' });
        }

        const memberId = await generateMemberId();
        let hashedPassword;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 12);
        }

        const user = new User({
            title, firstName, lastName, gender, organization,
            email: email.toLowerCase(),
            password: hashedPassword,
            speciality, branch, telephone, address,
            role: role || 'member',
            membershipStatus: membershipStatus || 'active',
            memberId,
            subscriptionStartDate: new Date(),
            subscriptionEndDate: subscriptionEndDate || null,
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'Member created successfully.',
            data: { ...user.toObject(), password: undefined },
        });
    } catch (error) {
        next(error);
    }
};

// ─── PUT /admin/member/:id ────────────────────────────────────────────────────
const updateMember = async (req, res, next) => {
    try {
        const {
            title, firstName, lastName, gender, organization,
            speciality, branch, telephone, address,
            role, membershipStatus, subscriptionEndDate, newPassword
        } = req.body;

        const updateData = {
            title, firstName, lastName, gender, organization,
            speciality, branch, telephone, address,
            role, membershipStatus
        };

        if (subscriptionEndDate) updateData.subscriptionEndDate = new Date(subscriptionEndDate);

        // Handle password reset separately
        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 12);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        res.status(200).json({ success: true, message: 'Member updated.', data: user });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /admin/member/:id/status ───────────────────────────────────────────
const updateStatus = async (req, res, next) => {
    try {
        const { membershipStatus, subscriptionEndDate } = req.body;

        if (!membershipStatus || !['active', 'inactive'].includes(membershipStatus)) {
            return res.status(400).json({
                success: false,
                message: 'membershipStatus must be "active" or "inactive".',
            });
        }

        const update = { membershipStatus };
        if (subscriptionEndDate) update.subscriptionEndDate = new Date(subscriptionEndDate);

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        res.status(200).json({
            success: true,
            message: `Membership status updated to "${membershipStatus}".`,
            data: user,
        });
    } catch (error) {
        next(error);
    }
};

// ─── DELETE /admin/member/:id ─────────────────────────────────────────────────
const deleteMember = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }
        res.status(200).json({ success: true, message: 'Member deleted successfully.' });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /admin/member/:id/reset-password ────────────────────────────────────
const resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.',
            });
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { password: hashed },
            { new: true }
        );
        if (!user) return res.status(404).json({ success: false, message: 'Member not found.' });
        res.status(200).json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /admin/member/:id/regenerate-member-id ────────────────────────────
const regenerateMemberId = async (req, res, next) => {
    try {
        const newMemberId = await generateMemberId();
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { memberId: newMemberId },
            { new: true }
        );
        if (!user) return res.status(404).json({ success: false, message: 'Member not found.' });
        res.status(200).json({
            success: true,
            message: 'Member ID regenerated.',
            memberId: newMemberId,
        });
    } catch (error) {
        next(error);
    }
};

// ─── PATCH /admin/member/:id/toggle-block ────────────────────────────────────
const toggleBlockMember = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`,
            isBlocked: user.isBlocked,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMembers,
    getMember,
    createMember,
    updateMember,
    updateStatus,
    deleteMember,
    resetPassword,
    regenerateMemberId,
    toggleBlockMember,
};
