const Profile = require('../models/profileSchema');
const Case = require('../models/caseSchema');

module.exports.getDashboard = async (req, res) => {
    try {
        // Get recent records
        const recentRecords = await Profile.find()
            .sort({ _id: -1 })
            .limit(5);

        // Get recent cases
        const recentCases = await Case.find()
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

        res.render('records/index', { recentRecords, recentCases, stats });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Failed to load dashboard');
        res.redirect('/');
    }
};

// New methods for handling card clicks
module.exports.getTotalRecords = async (req, res) => {
    try {
        const records = await Profile.find()
            .sort({ createdAt: -1 })
            .select('nameEnglish role caseNumber createdAt');

        res.render('records/totalRecords', {
            title: 'Total Records',
            records: records
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Failed to load total records');
        res.redirect('/');
    }
};

module.exports.getActiveCases = async (req, res) => {
    try {
        const activeCases = await Profile.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .select('nameEnglish role caseNumber status createdAt');

        res.render('records/activeCases', {
            title: 'Active Cases',
            records: activeCases
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Failed to load active cases');
        res.redirect('/');
    }
};

module.exports.getCurrentMonthCases = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const monthlyRecords = await Profile.find({
            createdAt: { $gte: startOfMonth }
        })
        .sort({ createdAt: -1 })
        .select('nameEnglish role caseNumber createdAt');

        res.render('records/monthlyRecords', {
            title: 'Cases This Month',
            records: monthlyRecords
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Failed to load monthly cases');
        res.redirect('/');
    }
};

module.exports.getCriminalRecords = async (req, res) => {
    try {
        const criminalRecords = await Profile.find({ role: 'criminal' })
            .sort({ createdAt: -1 })
            .select('nameEnglish caseNumber createdAt');

        res.render('records/criminalRecords', {
            title: 'Criminal Records',
            records: criminalRecords
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Failed to load criminal records');
        res.redirect('/');
    }
}; 