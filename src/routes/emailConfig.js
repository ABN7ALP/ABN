const emailjs = require('emailjs-com');

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    // إعداد EmailJS مع المفاتيح
    const emailjsConfig = {
      serviceID: process.env.EMAILJS_SERVICE_ID,
      templateID: process.env.EMAILJS_TEMPLATE_ID,
      userID: process.env.EMAILJS_PUBLIC_KEY
    };

    // إرسال الإيميل
    const result = await emailjs.send(
      emailjsConfig.serviceID,
      emailjsConfig.templateID,
      {
        to_email: email,
        verification_code: verificationCode,
        to_name: 'عميلنا العزيز',
        app_name: 'متجر الخدمات'
      },
      emailjsConfig.userID
    );

    console.log(`✅ تم إرسال كود التحقق إلى: ${email}`);
    return true;
  } catch (error) {
    console.error('❌ فشل إرسال الإيميل:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
