const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        trim: true,
    },
    organization: {
        type: String,
        required: [true, 'Organization is required'],
        trim: true,
    },
    profession: {
        type: String,
        required: [true, 'Profession is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        select: false, // Never returned in queries unless explicitly requested
    },
    telephone: {
        type: String,
        required: [true, 'Telephone number is required'],
        trim: true,
    },
    speciality: {
        type: String,
        trim: true,
    },
    addressLine1: {
        type: String,
        required: [true, 'Address Line 1 is required'],
        trim: true,
    },
    addressLine2: {
        type: String,
        trim: true,
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
    },
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true,
    },
    postCode: {
        type: String,
        required: [true, 'Post code is required'],
        trim: true,
    },
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member',
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    membershipStatus: {
        type: String,
        enum: ['active', 'inactive', 'registered'],
        default: 'registered',
    },
    memberId: {
        type: String,
    },
    stripeCustomerId: {
        type: String,
    },
    stripeSubscriptionId: {
        type: String,
    },
    subscriptionStartDate: {
        type: Date,
    },
    subscriptionEndDate: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// All indexes defined here (single source of truth — avoids Mongoose duplicate index warnings)
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ memberId: 1 }, { unique: true, sparse: true });
userSchema.index({ stripeCustomerId: 1 }, { sparse: true });
userSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });
userSchema.index({ membershipStatus: 1 });

module.exports = mongoose.model('User', userSchema);
