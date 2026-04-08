const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.APP_URL}/api/auth/google/callback`
},
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const profileImage = profile.photos[0]?.value;

        // البحث عن مستخدم موجود
        let user = await User.findOne({ email });

        if (user) {
            // تحديث صورة البروفايل إذا لم تكن موجودة
            if (!user.profileImage && profileImage) {
                user.profileImage = profileImage;
                await user.save();
            }
            return done(null, user);
        }

        // إنشاء مستخدم جديد
        user = await User.create({
            username: profile.displayName.toLowerCase().replace(/\s/g, '_') + '_' + Date.now().toString().slice(-4),
            email,
            password: 'GOOGLE_AUTH_' + Math.random().toString(36),
            profileImage,
            emailVerified: true, // جوجل يتحقق تلقائياً
            googleId: profile.id
        });

        return done(null, user);

    } catch (error) {
        return done(error, null);
    }
}));

module.exports = passport;
