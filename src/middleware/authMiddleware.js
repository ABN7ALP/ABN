exports.protect = (req, res, next) => {
  if (req.session.user) {
    // إذا كان المستخدم مسجلاً دخوله، اسمح له بالمرور
    next();
  } else {
    // إذا لم يكن مسجلاً، وجهه لصفحة تسجيل الدخول
    res.redirect('/auth/login');
  }
};
