const mongoose = require('mongoose');
const User = mongoose.model('User');

// @desc    عرض صفحة إدارة المستخدمين
// @route   GET /admin/users
exports.getUsersPage = async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', { users });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};
