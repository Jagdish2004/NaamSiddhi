const Profile = require('../models/profileSchema');

module.exports.getAnalytics = async (req, res) => {
    try {
        // Get overall statistics
        const totalRecords = await Profile.countDocuments();
        const criminalRecords = await Profile.countDocuments({ role: 'criminal' });
        const victimRecords = await Profile.countDocuments({ role: 'victim' });
        const witnessRecords = await Profile.countDocuments({ role: 'witness' });
        
        // Get monthly statistics
        const currentDate = new Date();
        const monthlyStats = await Profile.aggregate([
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 }
        ]);

        // Get location-based statistics
        const locationStats = await Profile.aggregate([
            {
                $group: {
                    _id: "$address.cityEnglish",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Get gender distribution
        const genderStats = await Profile.aggregate([
            {
                $group: {
                    _id: "$gender",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get age distribution
        const ageStats = await Profile.aggregate([
            {
                $project: {
                    age: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), "$dob"] },
                                365 * 24 * 60 * 60 * 1000
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $lt: ["$age", 18] }, then: "Under 18" },
                                { case: { $lt: ["$age", 25] }, then: "18-24" },
                                { case: { $lt: ["$age", 35] }, then: "25-34" },
                                { case: { $lt: ["$age", 50] }, then: "35-49" },
                            ],
                            default: "50+"
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.render('analytics', {
            stats: {
                total: totalRecords,
                criminal: criminalRecords,
                victim: victimRecords,
                witness: witnessRecords,
                monthly: monthlyStats,
                location: locationStats,
                gender: genderStats,
                age: ageStats
            }
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        req.flash('error', 'Error loading analytics');
        res.redirect('/');
    }
}; 