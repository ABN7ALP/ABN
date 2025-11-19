const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`تم الاتصال بقاعدة البيانات بنجاح: ${conn.connection.host}`);
  } catch (error) {
    console.error(`خطأ في الاتصال بقاعدة البيانات: ${error.message}`);
    process.exit(1); // إيقاف التطبيق في حال فشل الاتصال
  }
};

module.exports = connectDB;
