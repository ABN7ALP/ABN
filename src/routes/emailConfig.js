const nodemailer = require('nodemailer');

// إعداد transporter (استخدم إيميلك الحقيقي)
const transporter = nodemailer.createTransport({
  service: 'gmail', // أو 'outlook' أو 'yahoo' إلخ
  auth: {
    user: process.env.EMAIL_USER, // إيميلك
    pass: process.env.EMAIL_PASS  // كلمة المرور الخاصة بالتطبيق
  }
});

// دالة التحقق من اتصال الإيميل
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ تم الاتصال بخادم البريد الإلكتروني بنجاح');
    return true;
  } catch (error) {
    console.error('❌ فشل الاتصال بخادم البريد:', error);
    return false;
  }
};

// دالة إرسال الإيميل
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    // التحقق من الاتصال أولاً
    const isConnected = await verifyEmailConnection();
    if (!isConnected) {
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'كود التحقق - متجر الخدمات',
      html: `
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
              هذا الكود صالح لمدة ساعة واحدة فقط.<br>
              إذا لم تطلب هذا الكود، يرجى تجاهل هذا الإيميل.
            </p>
            <hr style="border: none; border-top: 2px dashed #e2e8f0; margin: 30px 0;">
            <p style="font-size: 12px; color: #94a3b8;">
              متجر الخدمات الرقمية
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ تم إرسال كود التحقق إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail, verifyEmailConnection };
