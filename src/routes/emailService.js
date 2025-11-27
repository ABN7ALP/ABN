const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASS
        }
    });
};

const sendEmail = async (email, code, isReset = false) => {
    try {
        console.log("🔄 محاولة إرسال الإيميل إلى:", email);

        const transporter = createTransporter();

        const mailOptions = {
            from: `"متجر الخدمات" <${process.env.BREVO_SMTP_USER}>`,
            to: email,
            subject: isReset ? "إعادة تعيين كلمة المرور" : "كود التحقق",
            html: `
                <h2>${isReset ? "إعادة تعيين كلمة المرور" : "كود التحقق"}</h2>
                <p>الكود الخاص بك هو:</p>
                <h1>${code}</h1>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("✅ تم إرسال الإيميل بنجاح");
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
