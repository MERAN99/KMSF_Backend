const Event = require('../models/Event');
const User = require('../models/User');
const { sendEventNotificationEmail } = require('../services/emailService');

// @desc    Get all events
// @route   GET /events
// @access  Public
exports.getEvents = async (req, res, next) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.status(200).json({
            success: true,
            count: events.length,
            data: events
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single event
// @route   GET /events/:id
// @access  Public
exports.getEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create new event (supports multiple images)
// @route   POST /admin/event
// @access  Private/Admin
exports.createEvent = async (req, res, next) => {
    try {
        const { title, date, time, location, description, category, prices } = req.body;

        const eventData = { title, date, time, location, description, category };

        // Handle multiple uploaded images — req.files is an array from upload.array()
        if (req.files && req.files.length > 0) {
            eventData.images = req.files.map(f => f.path); // Cloudinary returns full URL in path
        }

        // Handle prices if sent as a JSON string from FormData
        if (prices) {
            eventData.prices = typeof prices === 'string' ? JSON.parse(prices) : prices;
        }

        const event = await Event.create(eventData);

        res.status(201).json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update event (supports multiple images — new uploads are merged with existing)
// @route   PUT /admin/event/:id
// @access  Private/Admin
exports.updateEvent = async (req, res, next) => {
    try {
        const { title, date, time, location, description, category, prices, existingImages } = req.body;

        const eventData = { title, date, time, location, description, category };

        // Existing images kept by the client (they send back what they want to keep)
        let kept = [];
        if (existingImages) {
            kept = typeof existingImages === 'string' ? JSON.parse(existingImages) : existingImages;
        }

        // New uploads
        let newUploads = [];
        if (req.files && req.files.length > 0) {
            newUploads = req.files.map(f => f.path);
        }

        // Merge: keep selected existing + add new uploads
        eventData.images = [...kept, ...newUploads];

        // Handle prices
        if (prices) {
            eventData.prices = typeof prices === 'string' ? JSON.parse(prices) : prices;
        }

        const event = await Event.findByIdAndUpdate(req.params.id, eventData, {
            new: true,
            runValidators: true
        });

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete event
// @route   DELETE /admin/event/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res, next) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Notify members about an event
// @route   POST /admin/event/:id/notify
// @access  Private/Admin
exports.notifyMembers = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Event not found'
            });
        }

        // Get all active members (exclude admins)
        const recipients = await User.find({
            membershipStatus: 'active',
            role: { $ne: 'admin' }
        }).select('email firstName lastName title').lean();

        if (recipients.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No recipients found. No emails sent.',
                recipientCount: 0,
            });
        }

        // Send emails in background
        sendEventNotificationEmail(recipients, event);

        res.status(200).json({
            success: true,
            message: `Event notification process started for ${recipients.length} member(s). Emails are being sent in the background.`,
            data: {
                eventId: event._id,
                title: event.title,
                recipientCount: recipients.length
            },
        });
    } catch (error) {
        next(error);
    }
};
