const nodemailer = require('nodemailer');

// إعداد transporter باستخدام إعدادات SMTP المباشرة
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // استخدام TLS
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        },
        connectionTimeout: 10000, // 10 ثواني
        greetingTimeout: 10000,
        socketTimeout: 10000
    });
};

// دالة إرسال كود التحقق
const sendVerificationEmail = async (email, verificationCode) => {
    try {
        console.log(`🔄 محاولة إرسال إيميل إلى: ${email}`);
        
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'كود التحقق - متجر الخدمات',
            html: `
                <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <h1 style="color: #7C1EFF; margin-bottom: 10px;">🔐 كود التحقق</h1>
                        <p style="color: #64748B; font-size: 16px; margin-bottom: 30px;">
                            استخدم الكود التالي للتحقق من بريدك الإلكتروني:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 20px; border-radius: 15px; font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 20px 0;">
                            ${verificationCode}
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                            هذا الكود صالح لمدة 24 ساعة<br>
                            إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748B; font-size: 12px;">
                                متجر الخدمات الرقمية © 2024
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال كود التحقق إلى: ${email} - Message ID: ${info.messageId}`);
        return true;
        
    } catch (error) {
        console.error('❌ فشل إرسال الإيميل:', error.message);
        return false;
    }
};

// دالة إرسال كود إعادة تعيين كلمة المرور
const sendPasswordResetEmail = async (email, resetCode) => {
    try {
        console.log(`🔄 محاولة إرسال إيميل إعادة تعيين إلى: ${email}`);
        
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'إعادة تعيين كلمة المرور - متجر الخدمات',
            html: `
                <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <h1 style="color: #EF4444; margin-bottom: 10px;">🔑 إعادة تعيين كلمة المرور</h1>
                        <p style="color: #64748B; font-size: 16px; margin-bottom: 30px;">
                            استخدم الكود التالي لإعادة تعيين كلمة المرور:
                        </p>
                        
                        <div style="background: linear-gradient(135deg, #EF4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 15px; font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 20px 0;">
                            ${resetCode}
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                            هذا الكود صالح لمدة ساعة واحدة فقط<br>
                            إذا لم تطلب إعادة التعيين، يرجى تجاهل هذه الرسالة
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #64748B; font-size: 12px;">
                                متجر الخدمات الرقمية © 2024
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ تم إرسال كود إعادة التعيين إلى: ${email} - Message ID: ${info.messageId}`);
        return true;
        
    } catch (error) {
        console.error('❌ فشل إرسال إيميل إعادة التعيين:', error.message);
        return false;
    }
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
