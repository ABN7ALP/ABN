const { MailerSend, EmailParams, Sender, Recipient } = require("mailersend");

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

// 🆕 دالة لإرسال إيميل تفعيل الحساب
const sendActivationEmail = async (email, verificationCode) => {
  try {
    const sentFrom = new Sender("noreply@test-3m5jgrom13zgdpyo.mlsender.net", " MX GROUP متجر");
    const recipients = [new Recipient(email, "عميلنا العزيز")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("🎉 تفعيل حسابك - متجر الخدمات الرقمية")
      .setHtml(`
        <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <!-- 🆕 إضافة صورة المتجر -->
            <div style="text-align: center; margin-bottom: 20px;">
           <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 15px; border-radius: 15px; display: inline-block;">
          <h1 style="margin: 0; font-size: 24px;">🛍️ MX GROUP </h1>
         </div>
        </div>
            
            <h1 style="color: #7C1EFF; margin-bottom: 20px;">🎉 مرحباً بك!</h1>
            <p style="font-size: 16px; color: #64748B; margin-bottom: 30px;">
              شكراً لانضمامك إلينا! استخدم الكود التالي لتفعيل حسابك والبدء في استخدام خدماتنا:
            </p>
            
            <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 20px; border-radius: 15px; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            
            <p style="font-size: 14px; color: #94a3b8;">
              هذا الكود صالح لمدة 24 ساعة.<br>
              بعد التفعيل يمكنك البدء فوراً في طلب الخدمات.
            </p>
            
            <hr style="border: none; border-top: 2px dashed #e2e8f0; margin: 30px 0;">
            
            <div style="background: #f1f5f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #7C1EFF; margin-bottom: 10px;">🚀 خدماتنا المتاحة:</h3>
              <p style="margin: 5px 0; color: #64748B;">• متابعين 👥</p>
              <p style="margin: 5px 0; color: #64748B;">• لايكات ❤️</p>
              <p style="margin: 5px 0; color: #64748B;">• مشاهدات 👀</p>
              <p style="margin: 5px 0; color: #64748B;">• تعليقات 💬</p>
            </div>
            
            <div class="footer" style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
              <p>متجر  - نقدم أفضل الخدمات لأفضل العملاء MX GROUP </p>
              <p>📞 للاستفسار: <a href="https://wa.me/905367893256" style="color: #7C1EFF;">واتساب</a></p>
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
const sendPasswordResetEmail = async (email, verificationCode) => {
  try {
    const sentFrom = new Sender("noreply@test-3m5jgrom13zgdpyo.mlsender.net", "MX GROUP متجر");
    const recipients = [new Recipient(email, "عميلنا العزيز")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("🔐 إعادة تعيين كلمة المرور - MX GROUP")
      .setHtml(`
        <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; text-align: center; background: #f8fafc; padding: 30px;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            <!-- 🆕 إضافة صورة المتجر -->
            <div style="text-align: center; margin-bottom: 20px;">
           <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 15px; border-radius: 15px; display: inline-block;">
          <h1 style="margin: 0; font-size: 24px;">🛍️ MX GROUP </h1>
         </div>
        </div>
            
            <h1 style="color: #7C1EFF; margin-bottom: 20px;">🔐 إعادة التعيين</h1>
            <p style="font-size: 16px; color: #64748B; margin-bottom: 30px;">
              طلبت إعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الكود التالي:
            </p>
            
            <div style="background: linear-gradient(135deg, #7C1EFF 0%, #5a16ba 100%); color: white; padding: 20px; border-radius: 15px; font-size: 30px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${verificationCode}
            </div>
            
            <p style="font-size: 12px; color: #94a3b8;">
              هذا الكود صالح لمدة ساعة واحدة فقط.<br>
              إذا لم تطلب هذا الكود، يرجى تجاهل هذا الإيميل.
            </p>
            
            <div style="background: #fef2f2; padding: 15px; border-radius: 10px; margin: 20px 0; border-right: 4px solid #ef4444;">
              <p style="color: #dc2626; margin: 0; font-weight: bold;">⚠️ لأمان حسابك، لا تشارك هذا الكود مع احد</p>
            </div>
            
            <div class="footer" style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px;">
              <p>متجر  - نحرص على أمان حسابك MX GROUP </p>
              <p>MX GROUP</p>
            </div>
          </div>
        </div>
      `);

    await mailersend.email.send(emailParams);
    console.log(`✅ تم إرسال إيميل إعادة التعيين إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال إيميل إعادة التعيين:', error.message);
    return false;
  }
};

module.exports = { sendActivationEmail, sendPasswordResetEmail };
