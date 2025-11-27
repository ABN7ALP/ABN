const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465, 
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const sendEmail = async (email, code, isReset = false) => {
    try {
        console.log("🔄 محاولة إرسال الإيميل إلى:", email);

        const transporter = createTransporter();

        const mailOptions = {
            from: `"متجر الخدمات" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: isReset ? "إعادة تعيين كلمة المرور" : "كود التحقق",
            html: `<h2>${code}</h2>`
        };

        await transporter.sendMail(mailOptions);

        console.log("✅ تم الإرسال بنجاح");
        return true;

    } catch (err) {
        console.log("❌ خطأ في إرسال الإيميل:", err.message);
        return false;
    }
};

module.exports = {
    sendVerificationEmail: (email, code) => sendEmail(email, code, false),
    sendPasswordResetEmail: (email, code) => sendEmail(email, code, true)
};
