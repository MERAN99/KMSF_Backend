const User = require('../models/User');

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
const getAdminStats = async (req, res, next) => {
    try {
        // Run aggregation pipelines concurrently
        const [
            totalUsers,
            statusCounts,
            roleCounts,
            countryCounts,
            organizationCounts,
            blockStatusCounts
        ] = await Promise.all([
            User.countDocuments({ role: { $ne: 'admin' } }),

            // Group by subscription status
            User.aggregate([
                { $match: { role: { $ne: 'admin' } } },
                { $group: { _id: '$membershipStatus', count: { $sum: 1 } } }
            ]),

            // Group by role
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } }
            ]),

            // Group by country (top 5)
            User.aggregate([
                { $match: { role: { $ne: 'admin' }, country: { $exists: true, $ne: '' } } },
                { $group: { _id: '$country', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),

            // Group by organization (top 5)
            User.aggregate([
                { $match: { role: { $ne: 'admin' }, organization: { $exists: true, $ne: '' } } },
                { $group: { _id: '$organization', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]),

            // Group by block status
            User.aggregate([
                { $match: { role: { $ne: 'admin' } } },
                { $group: { _id: '$isBlocked', count: { $sum: 1 } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                statusCounts: statusCounts.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, { active: 0, inactive: 0, registered: 0 }),
                roleCounts: roleCounts.reduce((acc, curr) => {
                    acc[curr._id] = curr.count;
                    return acc;
                }, { admin: 0, member: 0 }),
                countryCounts,
                organizationCounts,
                blockCounts: {
                    blocked: blockStatusCounts.find(c => c._id === true)?.count || 0,
                    active: blockStatusCounts.find(c => c._id === false)?.count || 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAdminStats,
};
