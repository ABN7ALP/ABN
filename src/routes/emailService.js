const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        },
        pool: true,
        maxConnections: 1,
        maxMessages: 5
    });
};

const sendEmail = async (email, code, isReset = false) => {
    try {
        console.log(`🔄 محاولة إرسال الإيميل إلى: ${email}`);

        // وضع التطوير فقط على جهازك
        if (process.env.NODE_ENV === "development") {
            console.log(`📧 [DEV] ${isReset ? 'Reset' : 'Verify'}: ${code}`);
            return true;
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: `"متجر الخدمات" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: isReset ? 'إعادة تعيين كلمة المرور' : 'كود التحقق',
            html: `
                <h2>مرحباً</h2>
                <p>${isReset ? "كود إعادة تعيين كلمة المرور" : "كود التحقق"} هو:</p>
                <h1>${code}</h1>
            `
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ تم الإرسال بنجاح: ${email}`);
        return true;

    } catch (err) {
        console.log('❌ خطأ في إرسال الإيميل:', err.message);
        return false;
    }
};

module.exports = {
    sendVerificationEmail: (email, code) => sendEmail(email, code, false),
    sendPasswordResetEmail: (email, code) => sendEmail(email, code, true)
};
