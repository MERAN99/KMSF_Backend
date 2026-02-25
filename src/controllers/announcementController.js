const User = require('../models/User');
const Announcement = require('../models/Announcement');
const { sendAnnouncementEmail } = require('../services/emailService');

// ─── POST /admin/announcement ─────────────────────────────────────────────────
const sendAnnouncement = async (req, res, next) => {
    try {
        const { title, message, filter = 'active' } = req.body;

        // Build recipient query
        const query = { role: { $ne: 'admin' } };
        if (filter === 'active') {
            query.membershipStatus = 'active';
        }
        // filter === 'all' → no status restriction

        const recipients = await User.find(query).select('email firstName lastName').lean();

        if (recipients.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No recipients found. No emails sent.',
                recipientCount: 0,
            });
        }

        // Send emails (Background)
        sendAnnouncementEmail(recipients, title, message);

        // Save announcement record in DB
        const announcement = await Announcement.create({
            title,
            message,
            sentAt: new Date(),
            sentBy: req.user._id,
            filter,
            recipientCount: recipients.length,
        });

        res.status(201).json({
            success: true,
            message: `Announcement process started for ${recipients.length} recipient(s). Emails are being sent in the background.`,
            data: {
                announcementId: announcement._id,
                title,
                filter,
                recipientCount: recipients.length
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET /admin/announcements ─────────────────────────────────────────────────
const getAnnouncements = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [announcements, total] = await Promise.all([
            Announcement.find()
                .sort({ sentAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('sentBy', 'firstName lastName email')
                .lean(),
            Announcement.countDocuments(),
        ]);

        res.status(200).json({
            success: true,
            data: announcements,
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

module.exports = { sendAnnouncement, getAnnouncements };
