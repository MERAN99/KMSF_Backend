const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Announcement title is required'],
        trim: true,
    },
    message: {
        type: String,
        required: [true, 'Announcement message is required'],
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    filter: {
        type: String,
        enum: ['active', 'all'],
        default: 'active',
    },
    recipientCount: {
        type: Number,
        default: 0,
    },
});

module.exports = mongoose.model('Announcement', announcementSchema);
