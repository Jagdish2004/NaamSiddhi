const Profile = require('../models/profileSchema');

module.exports.getDashboard = async (req, res) => {
    try {
        // Get recent records
        const recentRecords = await Profile.find()
            .sort({ _id: -1 })
            .limit(5);

        // Get statistics
        const stats = {
            totalRecords: await Profile.countDocuments(),
            criminalRecords: await Profile.countDocuments({ role: 'criminal' }),
            monthlyRecords: await Profile.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setDate(1)) // First day of current month
                }
            }),
            activeCases: await Profile.countDocuments({ status: 'active' })
        };

        res.render('records/index', { recentRecords, stats });
    } catch (error) {
        req.flash('error', 'Error loading dashboard');
        res.redirect('/');
    }
}; 