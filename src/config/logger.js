const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// إنشاء "stream" للكتابة في ملف السجل
// سيتم إنشاء ملف access.log داخل مجلد logs الذي أنشأناه
const accessLogStream = fs.createWriteStream(path.join(__dirname, '..', '..', 'logs', 'access.log'), { flags: 'a' });

// تعريف تنسيق مخصص للتسجيل (شامل جداً)
// [التاريخ والوقت] - طريقة الطلب - الرابط - حالة الاستجابة - مدة الاستجابة - بيانات الطلب (Body)
morgan.token('body', (req) => {
  return JSON.stringify(req.body);
});

const logger = morgan(
  '[:date[iso]] :method :url :status :response-time ms - Body: :body', 
  { stream: accessLogStream }
);

module.exports = logger;
