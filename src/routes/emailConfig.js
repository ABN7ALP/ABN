const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

// الدالة الأصلية (لإعادة تعيين كلمة المرور)
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    const sentFrom = new Sender("noreply@test-3m5jgrom13zgdpyo.mlsender.net", "متجر الخدمات");
    const recipients = [new Recipient(email, "عميلنا العزيز")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("🔐 كود التحقق - متجر الخدمات")
      .setHtml(`
        <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h1 style="color: #7C1EFF; margin-bottom: 20px;">🔐 كود التحقق</h1>
            <p style="font-size: 16px; color: #64748B; margin-bottom: 30px;">
              استخدم الكود التالي لإعادة تعيين كلمة المرور الخاصة بك:
            </p>
            <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 20px; border-radius: 15px; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            <p style="font-size: 14px; color: #94a3b8;">
              هذا الكود صالح لمدة ساعة واحدة فقط.
            </p>
          </div>
        </div>
      `);

    await mailersend.email.send(emailParams);
    console.log(`✅ تم إرسال كود التحقق إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error.message);
    return false;
  }
};

// 🆕 الدالة الجديدة (لتفعيل الحساب)
const sendActivationEmail = async (email, verificationCode) => {
  try {
    const sentFrom = new Sender("noreply@test-3m5jgrom13zgdpyo.mlsender.net", "متجر الخدمات");
    const recipients = [new Recipient(email, "عميلنا العزيز")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("🎉 تفعيل حسابك - متجر الخدمات")
      .setHtml(`
        <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <h1 style="color: #7C1EFF; margin-bottom: 20px;">🎉 مرحباً بك في متجر الخدمات!</h1>
            <p style="font-size: 16px; color: #64748B; margin-bottom: 30px;">
              استخدم الكود التالي لتفعيل حسابك والبدء في استخدام خدماتنا:
            </p>
            <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 20px; border-radius: 15px; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            <p style="font-size: 14px; color: #94a3b8;">
              هذا الكود صالح لمدة 24 ساعة<br>
              شكراً لانضمامك إلينا!
            </p>
            <hr style="border: none; border-top: 2px dashed #e2e8f0; margin: 30px 0;">
            <p style="font-size: 12px; color: #94a3b8;">
              متجر الخدمات الرقمية
            </p>
          </div>
        </div>
      `);

    await mailersend.email.send(emailParams);
    console.log(`✅ تم إرسال إيميل التفعيل إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال إيميل التفعيل:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendActivationEmail };
