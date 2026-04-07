const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailersend = new MailerSend({
  apiKey: process.env.RESEND_API_KEY,
});
 
// 🆕 دالة لإرسال إيميل تفعيل الحساب
const sendActivationEmail = async (email, verificationCode) => {
  try {
    const sentFrom = new Sender("noreply@test-3m5jgrom13zgdpyo.mlsender.net", "abn.7alp from AP-TAEM");
    const recipients = [new Recipient(email, "عميلنا العزيز")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("🎉 AP-TAEM - تفعيل حسابك ")
      .setHtml(`
        <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: right; background: #f9fafb; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px;">
            
            <h2 style="color: #111827; margin-bottom: 15px;">تفعيل حسابك في AP-TAEM</h2>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
              مرحباً بك! خطوة أخيرة تفصلك عن البدء. استخدم الكود التالي لتأكيد بريدك الإلكتروني:
            </p>
            
            <div style="background: #f3f4f6; border: 1px dashed #d1d5db; color: #111827; padding: 20px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              هذا الكود صالح لمدة 24 ساعة. إذا لم تقم بطلب إنشاء حساب، يرجى تجاهل هذه الرسالة.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <div style="text-align: center; color: #9ca3af; font-size: 12px;">
              <p>فريق AP-TAEM</p>
            </div>
          </div>
        </div>
      `);


    await mailersend.email.send(emailParams);
    console.log(`✅ تم إرسال إيميل التفعيل إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال إيميل التفعيل:', error.message);
    return false;
  }
};

// 🆕 دالة لإرسال إيميل إعادة تعيين كلمة المرور
// استبدل الدالة الحالية بهذه النسخة
const sendPasswordResetEmail = async (email, verificationCode) => {
  try {
    const sentFrom = new Sender("noreply@test-3m5jgrom13zgdpyo.mlsender.net", "abn.7alp from AP-TAEM");
    const recipients = [new Recipient(email, "عميلنا العزيز")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("🔐 إعادة تعيين كلمة المرور - AP-TAEM")
      .setHtml(`
        <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: right; background: #f9fafb; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px;">
            
            <h2 style="color: #111827; margin-bottom: 15px;">إعادة تعيين كلمة المرور</h2>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
              لقد طلبت إعادة تعيين كلمة المرور. استخدم الكود التالي للمتابعة:
            </p>
            
            <div style="background: #f3f4f6; border: 1px dashed #d1d5db; color: #111827; padding: 20px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              هذا الكود صالح لمدة ساعة واحدة. لأمان حسابك، لا تشارك هذا الكود مع أي شخص.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            
            <div style="text-align: center; color: #9ca3af; font-size: 12px;">
              <p>فريق MX GROUP</p>
            </div>
          </div>
        </div>
      `);

    await mailersend.email.send(emailParams);
    console.log(`✅ تم إرسال إيميل إعادة التعيين إلى: ${email}`);
    return true;
  } catch (error) {
    // 🎯 هذا هو التعديل الأهم: التعامل مع الأخطاء بشكل أفضل
    console.error('❌ فشل إرسال إيميل إعادة التعيين:', error.body ? JSON.stringify(error.body) : error.message);
    return false;
  }
};


module.exports = { sendActivationEmail, sendPasswordResetEmail };
