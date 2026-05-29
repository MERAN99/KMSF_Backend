const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Team member name is required'],
        trim: true,
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true,
    },
    image: {
        type: String,
        required: [true, 'Image is required'],
    },
    bio: {
        type: String,
        trim: true,
    },
    detail: {
        type: String,
        trim: true,
    },
    teamType: {
        type: String,
        required: [true, 'Team type is required'],
        enum: ['kmsf', 'ksa', 'kuma', 'audioVisual'],
    },
    order: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);
