const EmailJS = require('@emailjs/nodejs');

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    // إرسال الإيميل باستخدام الحزمة الصحيحة
    const result = await EmailJS.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        verification_code: verificationCode,
        to_name: 'عميلنا العزيز',
        app_name: 'متجر الخدمات'
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        // privateKey: process.env.EMAILJS_PRIVATE_KEY // اختياري
      }
    );

    console.log(`✅ تم إرسال كود التحقق إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
