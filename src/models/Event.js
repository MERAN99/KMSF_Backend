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
    image: {
        type: String, // URL or filename
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

module.exports = mongoose.model('Event', eventSchema);
