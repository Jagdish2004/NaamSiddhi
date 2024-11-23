const Profile = require('../models/profileSchema');

module.exports.getAnalytics = async (req, res) => {
    try {
        // Get overall statistics
        const totalRecords = await Profile.countDocuments();
        const criminalRecords = await Profile.countDocuments({ role: 'criminal' });
        const victimRecords = await Profile.countDocuments({ role: 'victim' });
        const witnessRecords = await Profile.countDocuments({ role: 'witness' });
        
        // Get monthly statistics with proper month names
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

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

        // Format monthly stats with proper labels
        const formattedMonthlyStats = monthlyStats.map(stat => ({
            ...stat,
            monthLabel: `${monthNames[stat._id.month - 1]} ${stat._id.year}`,
            count: stat.count,
            axisLabels: {
                x: 'Timeline (Months)',
                y: 'Number of Records'
            }
        }));

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
                monthly: formattedMonthlyStats,
                location: locationStats,
                gender: genderStats,
                age: ageStats,
                chartLabels: {
                    monthly: {
                        xAxis: 'Timeline (Months)',
                        yAxis: 'Number of Records'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        req.flash('error', 'Error loading analytics');
        res.redirect('/');
    }
};

module.exports.getSuggestions = async (req, res) => {
    try {
        const query = req.query.query;
        
        if (!query || query.length < 1) {
            return res.json([]);
        }

        // Search in multiple fields with case-insensitive matching
        const suggestions = await Profile.find({
            $or: [
                { nameEnglish: { $regex: query, $options: 'i' } },
                { nameHindi: { $regex: query, $options: 'i' } },
                { 'address.cityEnglish': { $regex: query, $options: 'i' } }
            ]
        })
        .select('nameEnglish nameHindi address.cityEnglish')
        .limit(5)
        .exec();

        // Format suggestions for display
        const formattedSuggestions = suggestions.map(profile => ({
            name: profile.nameEnglish,
            nameHindi: profile.nameHindi,
            city: profile.address?.cityEnglish
        }));

        res.json(formattedSuggestions);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 