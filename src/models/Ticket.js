const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ticketSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Ticket must belong to a user']
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Ticket must belong to an event']
    },
    ticketType: {
        type: String,
        required: [true, 'Ticket type is required'] // e.g. 'Student', 'Member', 'Non-member'
    },
    pricePaid: {
        type: Number,
        required: true,
        default: 0
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'free', 'pending'],
        required: true
    },
    stripeSessionId: {
        type: String
    },
    ticketCode: {
        type: String,
        default: () => uuidv4().split('-')[0].toUpperCase(), // Generate short unique code
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Avoid a user buying multiple tickets for the same event if not desired
// Let's allow it in case they want to buy multiple? The prompt didn't specify.
// Usually, we can index to prevent duplicates:
// ticketSchema.index({ user: 1, event: 1 }, { unique: true });
// For now, no strict unique index in case they buy for friends, unless we add quantity. We'll leave it out for flexibility.

// Add basic indexes for quick fetching
ticketSchema.index({ user: 1 });
ticketSchema.index({ event: 1 });
ticketSchema.index({ ticketCode: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
