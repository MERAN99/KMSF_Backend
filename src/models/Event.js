const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g., 'Student', 'Member', 'Non-member'
    amount: { type: String, required: true }, // e.g., 'Free', '£20', '£40'
});

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Event title is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    // Multiple images stored as an array of URLs (Cloudinary)
    images: {
        type: [String],
        default: [],
    },
    date: {
        type: Date,
        required: [true, 'Event date is required'],
    },
    time: {
        type: String, // e.g., '9:00 AM - 8:30 PM'
        required: [true, 'Event time is required'],
    },
    location: {
        type: String,
        required: [true, 'Event location is required'],
        trim: true,
    },
    category: {
        type: String,
        default: 'Conference',
    },
    prices: [priceSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Virtual: expose first image as `image` for backwards-compat with the events page
eventSchema.virtual('image').get(function () {
    return this.images && this.images.length > 0 ? this.images[0] : null;
});

// Ensure virtuals are included when converting to JSON/Object
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
