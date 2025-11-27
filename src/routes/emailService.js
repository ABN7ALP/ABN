const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// دالة مشتركة لإرسال الإيميلات
const sendEmail = async (email, code, isReset = false) => {
    try {
        console.log(`🔄 محاولة إرسال إيميل إلى: ${email}`);
        
        const subject = isReset ? 'إعادة تعيين كلمة المرور - متجر الخدمات' : 'كود التحقق - متجر الخدمات';
        const title = isReset ? '🔑 إعادة تعيين كلمة المرور' : '🔐 كود التحقق';
        const description = isReset ? 
            'استخدم الكود التالي لإعادة تعيين كلمة المرور:' : 
            'استخدم الكود التالي للتحقق من بريدك الإلكتروني:';
        const bgColor = isReset ? 
            'linear-gradient(135deg, #EF4444 0%, #dc2626 100%)' : 
            'linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%)';
        const validity = isReset ? 'ساعة واحدة' : '24 ساعة';

        const { data, error } = await resend.emails.send({
            from: 'SMM Store <onboarding@resend.dev>',
            to: email,
            subject: subject,
            html: `
                <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <h1 style="color: ${isReset ? '#EF4444' : '#7C1EFF'}; margin-bottom: 10px;">${title}</h1>
                        <p style="color: #64748B; font-size: 16px; margin-bottom: 30px;">
                            ${description}
                        </p>
                        
                        <div style="background: ${bgColor}; color: white; padding: 20px; border-radius: 15px; font-size: 32px; font-weight: bold; letter-spacing: 10px; margin: 20px 0;">
                            ${code}
                        </div>
                        
                        <p style="color: #94a3b8; font-size: 14px; margin-top: 30px;">
                            هذا الكود صالح لمدة ${validity} فقط<br>
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
        });

        if (error) {
            console.error('❌ فشل إرسال الإيميل:', error);
            return false;
        }

        console.log(`✅ تم إرسال الإيميل إلى: ${email} - ID: ${data.id}`);
        return true;
        
    } catch (error) {
        console.error('❌ خطأ في إرسال الإيميل:', error);
        return false;
    }
};

// دالة إرسال كود التحقق
const sendVerificationEmail = async (email, verificationCode) => {
    return await sendEmail(email, verificationCode, false);
};

// دالة إرسال كود إعادة تعيين كلمة المرور
const sendPasswordResetEmail = async (email, resetCode) => {
    return await sendEmail(email, resetCode, true);
};

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail
};
