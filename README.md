# متجر SMM Store

![SMM Store Banner](https://i.ibb.co/XYZ/smm-store-banner.png) <!-- يمكنك استبدال هذا برابط صورة بانر مناسبة للمشروع -->

**متجر SMM Store** هو نظام متكامل لإدارة وطلب خدمات التسويق الرقمي لمنصات التواصل الاجتماعي. تم بناء المشروع باستخدام MERN Stack (MongoDB, Express.js, React/Vanilla JS, Node.js) مع التركيز على الأمان، الأداء، وتجربة المستخدم التفاعلية.

---

## ✨ الميزات الرئيسية

-   **نظام مصادقة آمن:** تسجيل، دخول، استعادة كلمة مرور، مع حماية ضد هجمات القوة الغاشمة.
-   **إدارة المستخدمين:** لوحة تحكم للأدمن لعرض وتعديل بيانات المستخدمين.
-   **نظام خدمات ديناميكي:** إضافة، تعديل، وحذف الخدمات بسهولة من لوحة التحكم.
-   **نظام طلبات متكامل:** يمكن للمستخدمين طلب الخدمات باستخدام الرصيد المتاح.
-   **شحن الرصيد:** دعم طرق دفع متعددة مع نظام موافقة يدوي من الأدمن.
-   **لوحة تحكم شاملة:** إحصائيات، إدارة الطلبات، المستخدمين، والخدمات في مكان واحد.
-   **تحديثات فورية (Real-time):** استخدام **Socket.IO** لإرسال إشعارات فورية للمستخدمين والمدراء (طلبات جديدة، تحديثات الحالة، إلخ).
-   **نظام طابور مهام (Queue System):** استخدام **BullMQ** مع **Redis** لمعالجة المهام الخلفية (مثل إرسال الإيميلات والإشعارات الجماعية) بكفاءة عالية.
-   **نظام عروض وخصومات متقدم:** إمكانية إنشاء عروض مخصصة (للمستخدمين الجدد، خصومات مؤقتة) يتم تطبيقها تلقائياً عند حساب السعر.
-   **أمان متقدم:**
    -   حماية شاملة باستخدام `Helmet`.
    -   حماية ضد هجمات CSRF باستخدام `csurf`.
    -   التحقق من صحة المدخلات باستخدام `express-validator`.
    -   تحديد معدل الطلبات (Rate Limiting) لمنع الاستخدام المفرط.
    -   تشفير كلمات المرور باستخدام `bcryptjs`.

---

## 🛠️ التقنيات المستخدمة

### الواجهة الخلفية (Backend)

-   **Node.js** & **Express.js**: بيئة التشغيل وإطار العمل.
-   **MongoDB** & **Mongoose**: قاعدة البيانات ونمذجة البيانات.
-   **Redis**: لتخزين الجلسات وإدارة طابور المهام.
-   **BullMQ**: نظام طابور مهام قوي مبني على Redis.
-   **Socket.IO**: للتواصل ثنائي الاتجاه في الوقت الفعلي.
-   **JWT (jsonwebtoken)**: لإدارة جلسات المستخدمين وتأمين الـ API.
-   **Cloudinary** & **Multer**: لرفع ومعالجة الصور (صور الملف الشخصي والإيصالات).
-   **Nodemailer / MailerSend**: لإرسال رسائل البريد الإلكتروني (تفعيل الحساب، استعادة كلمة المرور).
-   **Helmet, CORS, HPP, etc.**: حزم أمان متنوعة.

### الواجهة الأمامية (Frontend)

-   **HTML5, CSS3, Vanilla JavaScript**: بناء واجهات المستخدم الأساسية.
-   **Socket.IO Client**: للتواصل مع الخادم في الوقت الفعلي.
-   **Phosphor Icons**: مكتبة أيقونات عصرية.

---

## 🚀 كيفية تشغيل المشروع محلياً

اتبع الخطوات التالية لإعداد وتشغيل المشروع على جهازك.

### المتطلبات

-   [Node.js](https://nodejs.org/) (إصدار 16 أو أحدث)
-   [MongoDB](https://www.mongodb.com/try/download/community)
-   [Redis](https://redis.io/docs/getting-started/installation/)

### خطوات الإعداد

1.  **نسخ المستودع:**
    ```bash
    git clone https://github.com/your-username/smm-store.git
    cd smm-store
    ```

2.  **تثبيت الاعتماديات:**
    ```bash
    npm install
    ```

3.  **إعداد متغيرات البيئة:**
    -   قم بإنشاء ملف جديد باسم `.env` في المجلد الرئيسي للمشروع.
    -   انسخ محتوى ملف `.env.example` (إذا كان موجوداً) والصقه في ملف `.env`.
    -   املأ المتغيرات بالقيم الصحيحة:
        ```env
        PORT=3000
        MONGODB_URI=mongodb://localhost:27017/smm-store
        REDIS_URL=redis://127.0.0.1:6379
        JWT_SECRET=your_super_secret_jwt_key
        CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
        CLOUDINARY_API_KEY=your_cloudinary_api_key
        CLOUDINARY_API_SECRET=your_cloudinary_api_secret
        MAILERSEND_API_KEY=your_mailersend_api_key
        TELEGRAM_BOT_TOKEN=your_telegram_bot_token
        TELEGRAM_CHAT_ID=your_telegram_chat_id
        ```

4.  **تشغيل الخادم:**
    ```bash
    npm start
    ```

5.  **الوصول للتطبيق:**
    -   افتح المتصفح وانتقل إلى `http://localhost:3000`.
    -   لوحة تحكم الأدمن متاحة على `http://localhost:3000/admin.html`.

---

## 📁 بنية المشروع

smm-store/
├── public/             # ملفات الواجهة الأمامية (HTML, CSS, JS)
├── src/
│   ├── config/         # إعدادات (Socket.IO, Cloudinary)
│   ├── middleware/     # الوسيطات (المصادقة، الأمان، التحقق)
│   ├── models/         # نماذج قاعدة البيانات (Mongoose Schemas)
│   ├── routes/         # مسارات الـ API
│   └── services/       # الخدمات المنطقية (الرفع، الطابور، التلغرام)
├── .env                # متغيرات البيئة (غير موجود في المستودع)
├── server.js           # نقطة الدخول الرئيسية للتطبيق
└── package.json        # الاعتماديات والسكربتات


---

## 🤝 للمساهمة

نرحب بالمساهمات لتحسين المشروع! يرجى اتباع الخطوات التالية:

1.  قم بعمل Fork للمستودع.
2.  أنشئ فرعاً جديداً لميزتك (`git checkout -b feature/AmazingFeature`).
3.  قم بإجراء التغييرات المطلوبة.
4.  قم بعمل Commit لتغييراتك (`git commit -m 'Add some AmazingFeature'`).
5.  ارفع التغييرات إلى الفرع (`git push origin feature/AmazingFeature`).
6.  افتح طلب سحب (Pull Request).

---

## 📄 الترخيص

هذا المشروع مرخص تحت ترخيص ISC. انظر ملف `LICENSE` لمزيد من التفاصيل.
