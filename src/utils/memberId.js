const User = require('../models/User');

/**
 * Generate a unique member ID in the format MBR-XXXXXXXX
 * Retries on collision (extremely rare with 36^8 space)
 */
const generateMemberId = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let memberId;
    let isUnique = false;

    while (!isUnique) {
        const random = Array.from({ length: 8 }, () =>
            chars.charAt(Math.floor(Math.random() * chars.length))
        ).join('');

        memberId = `MBR-${random}`;

        // Check uniqueness in DB
        const existing = await User.findOne({ memberId });
        if (!existing) {
            isUnique = true;
        }
    }

    return memberId;
};

module.exports = { generateMemberId };
