const User = require('../models/User');

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
const getAdminStats = async (req, res, next) => {
    try {
        // Run aggregation pipelines concurrently
        const [
            totalUsers,
            statusCounts,
            roleCounts,
            regionCounts,
            organizationCounts,
            professionCounts,
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

            // Group by region (top 5)
            User.aggregate([
                { $match: { role: { $ne: 'admin' }, countyRegion: { $exists: true, $ne: '' } } },
                { $group: { _id: '$countyRegion', count: { $sum: 1 } } },
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

            // Group by profession — normalize free-text variants to canonical names
            User.aggregate([
                {
                    $match: {
                        role: { $ne: 'admin' },
                        profession: { $exists: true, $ne: '' },
                        // Exclude non-profession free-text entries (case-insensitive handled below)
                    }
                },
                {
                    // Normalize the profession to a canonical, trimmed, title-cased key
                    $addFields: {
                        normalizedProfession: {
                            $let: {
                                vars: { p: { $toLower: { $trim: { input: '$profession' } } } },
                                in: {
                                    $switch: {
                                        branches: [
                                            // ── Exclude non-professions ──────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['housewife', 'house wife', 'home maker', 'homemaker', 'retired', 'unemployed', 'n/a', 'na', 'none', 'other', '']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'housewife'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'house wife'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'homemaker'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'unemployed'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'retired'] }, -1] }
                                            ]}, then: null },

                                            // ── Doctor / Medical variants ────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['doctor', 'dr', 'physician', 'gp', 'general practitioner', 'medic', 'surgeon', 'medicine', 'medical doctor', 'medical officer', 'medical science']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'doctor'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'surgeon'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'physician'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'medic'] }, -1] }
                                            ]}, then: 'Doctor' },

                                            // ── Pharmacist variants ──────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['pharmacist', 'pharmacy', 'pharmaceutical', 'pharmaceutical sciences', 'pharmacy student', 'pharmacy technician', 'clinical pharmacist', 'clinical pharmacy', 'pharmacology', 'hospital pharmacist', 'community pharmacist']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'pharmac'] }, -1] }
                                            ]}, then: 'Pharmacist' },

                                            // ── Nurse variants (any "nurse" role maps to Nurse) ──────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['nurse', 'nursing', 'registered nurse', 'staff nurse', 'dental nurse', 'clinical lead nurse', 'lead nurse', 'oncologist nurse', 'oncology nurse', 'nurse practitioner', 'advanced nurse practitioner', 'district nurse', 'community nurse', 'practice nurse', 'school nurse', 'mental health nurse', 'paediatric nurse', 'pediatric nurse', 'critical care nurse', 'icu nurse', 'theatre nurse', 'scrub nurse', 'charge nurse', 'ward nurse', 'agency nurse', 'bank nurse', 'specialist nurse']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'nurse'] }, -1] }
                                            ]}, then: 'Nurse' },

                                            // ── Dentist variants ─────────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['dentist', 'dentistry', 'dental', 'orthodontist']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'dent'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'orthodont'] }, -1] }
                                            ]}, then: 'Dentist' },

                                            // ── Computer Scientist variants ──────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['computer scientist', 'computer science', 'software engineer', 'software developer', 'software engineering', 'it', 'information technology', 'computer engineer', 'computing']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'comput'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'software'] }, -1] }
                                            ]}, then: 'Computer Scientist' },

                                            // ── Data Scientist variants ──────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['data scientist', 'data analyst', 'data science']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'data'] }, -1] }
                                            ]}, then: 'Data Scientist' },

                                            // ── Psychologist variants ────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['psychologist', 'psychotherapy', 'psychotherapist', 'psychology']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'psych'] }, -1] }
                                            ]}, then: 'Psychologist' },

                                            // ── Biologist variants ───────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['biologist', 'biology', 'biochemist', 'biochemistry', 'biomedical scientist', 'biomedical science', 'biomedical engineering', 'biotechnologist', 'biotechnology']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'bio'] }, -1] }
                                            ]}, then: 'Biologist' },

                                            // ── Mathematician variants ───────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['mathematician', 'mathematics', 'math', 'maths', 'statistician', 'statistics', 'actuarial science']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'math'] }, -1] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'statistic'] }, -1] }
                                            ]}, then: 'Mathematician' },

                                            // ── Neuroscientist variants ──────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['neuroscientist', 'neuroscience']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'neuro'] }, -1] }
                                            ]}, then: 'Neuroscientist' },

                                            // ── Physiotherapist variants ─────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['physiotherapist', 'physiotherapy', 'physical therapist']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'physio'] }, -1] }
                                            ]}, then: 'Physiotherapist' },

                                            // ── Radiographer variants ────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['radiographer', 'radiography', 'radiologist', 'radiology']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'radio'] }, -1] }
                                            ]}, then: 'Radiographer' },

                                            // ── Social Sciences variants ─────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['social sciences', 'social scientist', 'social science']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'social scien'] }, -1] }
                                            ]}, then: 'Social Scientist' },

                                            // ── Scientist (generic) ──────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['scientist', 'environmental scientist', 'environmental science', 'epidemiologist', 'epidemiology', 'geneticist', 'genetics']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'scienti'] }, -1] }
                                            ]}, then: 'Scientist' },

                                            // ── Midwife variants ─────────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['midwife', 'midwifery']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'midwif'] }, -1] }
                                            ]}, then: 'Midwife' },

                                            // ── Paramedic variants ───────────────────────────────────────────────
                                            { case: { $or: [
                                                { $in: ['$$p', ['paramedic', 'paramedic science']] },
                                                { $gt: [{ $indexOfCP: ['$$p', 'paramedic'] }, -1] }
                                            ]}, then: 'Paramedic' },

                                            // ── Student (subject-unspecified) ────────────────────────────────────
                                            { case: { $in: ['$$p', ['student']] }, then: 'Student' },
                                        ],
                                        default: {
                                            // For anything not matched, title-case the original trimmed value
                                            $reduce: {
                                                input: { $split: [{ $trim: { input: '$profession' } }, ' '] },
                                                initialValue: '',
                                                in: {
                                                    $concat: [
                                                        '$$value',
                                                        { $cond: [{ $eq: ['$$value', ''] }, '', ' '] },
                                                        { $toUpper: { $substrCP: ['$$this', 0, 1] } },
                                                        { $substrCP: ['$$this', 1, { $subtract: [{ $strLenCP: '$$this' }, 1] }] }
                                                    ]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                // Remove excluded (null) entries
                { $match: { normalizedProfession: { $ne: null } } },
                // Group by the normalized profession and collect users
                {
                    $group: {
                        _id: '$normalizedProfession',
                        count: { $sum: 1 },
                        users: {
                            $push: {
                                _id: '$_id',
                                firstName: '$firstName',
                                lastName: '$lastName',
                                title: '$title',
                                email: '$email',
                                telephone: '$telephone',
                                organization: '$organization',
                                profession: '$profession',
                                speciality: '$speciality',
                                membershipStatus: '$membershipStatus',
                                memberId: '$memberId',
                                city: '$city',
                                countyRegion: '$countyRegion',
                                country: '$country',
                                isBlocked: '$isBlocked',
                                createdAt: '$createdAt'
                            }
                        }
                    }
                },
                { $sort: { count: -1 } }
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
                regionCounts,
                organizationCounts,
                professionCounts,
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
