const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // ضبط خيارات الاتصال
    const options = {
      serverSelectionTimeoutMS: 5000, // مهلة 5 ثوانٍ لمحاولة الاتصال
      socketTimeoutMS: 45000, // مهلة 45 ثانية للعمليات
    };

    console.log('جاري محاولة الاتصال بقاعدة البيانات...');
    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`تم الاتصال بقاعدة البيانات بنجاح: ${conn.connection.host}`);
  } catch (error) {
    // إذا فشل الاتصال، اطبع الخطأ وأوقف تشغيل الخادم
    console.error('!!!!!!!!!! فشل الاتصال بقاعدة البيانات !!!!!!!!!!');
    console.error(`الخطأ: ${error.message}`);
    process.exit(1); // إيقاف العملية مع رمز خطأ
  }
};

module.exports = connectDB;
