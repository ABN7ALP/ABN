const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'onboarding@resend.dev'; // استخدم هذا في البداية المجانية

const sendActivationEmail = async (email, verificationCode) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: '🎉 تفعيل حسابك',
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; background: #f9fafb; padding: 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px;">
                        <h2 style="color: #111827;">تفعيل حسابك</h2>
                        <p style="color: #374151;">استخدم الكود التالي لتفعيل حسابك:</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; color: #7C1EFF;">
                            ${verificationCode}
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">الكود صالح 24 ساعة.</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend error:', error);
            return false;
        }

        console.log('✅ تم إرسال إيميل التفعيل:', data.id);
        return true;
    } catch (error) {
        console.error('❌ فشل إرسال إيميل التفعيل:', error.message);
        return false;
    }
};

const sendPasswordResetEmail = async (email, verificationCode) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: '🔐 إعادة تعيين كلمة المرور',
            html: `
                <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right; background: #f9fafb; padding: 20px;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px;">
                        <h2 style="color: #111827;">إعادة تعيين كلمة المرور</h2>
                        <p style="color: #374151;">استخدم الكود التالي:</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; color: #7C1EFF;">
                            ${verificationCode}
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">الكود صالح ساعة واحدة.</p>
                    </div>
                </div>
            `
        });

        if (error) {
            console.error('❌ Resend error:', error);
            return false;
        }

        console.log('✅ تم إرسال إيميل إعادة التعيين:', data.id);
        return true;
    } catch (error) {
        console.error('❌ فشل إرسال إيميل التعيين:', error.message);
        return false;
    }
};

module.exports = { sendActivationEmail, sendPasswordResetEmail };
