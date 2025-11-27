const fetch = require('node-fetch');

const sendVerificationEmail = async (email, verificationCode) => {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: email,
          verification_code: verificationCode,
          to_name: 'عميلنا العزيز',
          app_name: 'متجر الخدمات'
        }
      })
    });

    if (response.ok) {
      console.log(`✅ تم إرسال كود التحقق إلى: ${email}`);
      return true;
    } else {
      const error = await response.text();
      console.error('❌ فشل إرسال الإيميل:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ خطأ في إرسال الإيميل:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail };
