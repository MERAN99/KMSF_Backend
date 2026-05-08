const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // Null if anonymous donation
    },
    donorName: {
        type: String,
        default: 'Anonymous', // Will store the name if registered/logged in
    },
    amount: {
        type: Number,
        required: [true, 'Donation amount is required'],
    },
    currency: {
        type: String,
        required: [true, 'Currency is required'],
        default: 'USD',
    },
    stripeSessionId: {
        type: String,
        required: [true, 'Stripe session ID is required for verification'],
        unique: true,
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },
    message: {
        type: String,
        default: '',
        trim: true,
    },
    showPublicly: {
        type: Boolean,
        default: false, // Admin must explicitly feature a message to show it publicly
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Donation', donationSchema);
