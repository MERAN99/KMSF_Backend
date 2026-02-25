const mongoose = require('mongoose');

const verificationTokenSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: '10m' }, // Token auto-deletes after 10 minutes
    },
    verified: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Index for fast lookups
verificationTokenSchema.index({ email: 1, code: 1 });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);
