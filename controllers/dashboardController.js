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
            totalCases: await Case.countDocuments(),
            activeCases: await Case.countDocuments({ status: 'active' }),
            monthlyRecords: await Profile.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setDate(1)) // First day of current month
                }
            }),
            monthlyCases: await Case.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setDate(1)) // First day of current month
                }
            }),
            pendingCases: await Case.countDocuments({ status: 'pending' }),
            closedCases: await Case.countDocuments({ status: 'closed' }),
            profilesWithAadhar: await Profile.countDocuments({ 
                aadharNumber: { $exists: true, $ne: '' } 
            })
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
            .select('firstNameEnglish middleNameEnglish lastNameEnglish aadharNumber createdAt');

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
        const activeCases = await Case.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .select('caseNumber description status createdAt');

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
        
        const monthlyRecords = await Case.find({
            createdAt: { $gte: startOfMonth }
        })
        .sort({ createdAt: -1 })
        .select('caseNumber description status createdAt');

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
        const pendingCases = await Case.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .select('caseNumber description status createdAt');

        res.render('records/criminalRecords', {
            title: 'Pending Cases',
            records: pendingCases
        });
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Failed to load pending cases');
        res.redirect('/');
    }
}; 