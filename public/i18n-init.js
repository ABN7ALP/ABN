// public/i18n-init.js

// دالة لجلب ملف الترجمة
async function fetchTranslation(lng) {
    try {
        const response = await fetch(`./locales/${lng}/translation.json`);
        if (!response.ok) {
            // إذا فشل تحميل لغة معينة، استخدم الإنجليزية كاحتياط
            const fallbackResponse = await fetch(`./locales/en/translation.json`);
            return await fallbackResponse.json();
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to load translation file:', error);
        // في حال فشل كل شيء، ارجع كائن فارغ
        return {};
    }
}

// دالة لتطبيق الترجمات على الصفحة
function updateContent(t) {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            // التحقق إذا كان العنصر هو input لوضع placeholder
            if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
                element.placeholder = t(key);
            } else {
                element.innerHTML = t(key);
            }
        }
    });
}

// دالة لتهيئة وتغيير اللغة
async function initI18next(lng) {
    const resources = {
        [lng]: {
            translation: await fetchTranslation(lng)
        }
    };

    await i18next.init({
        lng: lng,
        debug: false, // غيرها إلى true لرؤية سجلات التصحيح
        resources: resources
    });

    // تطبيق الترجمات
    updateContent(i18next.t);

    // تحديث اتجاه الصفحة
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
}

// الكشف عن اللغة وتطبيقها عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // استخدم i18next-browser-languagedetector لتحديد اللغة
    const detector = new i18nextBrowserLanguageDetector();
    const detectedLng = detector.detect(['querystring', 'localStorage', 'navigator']);
    
    // استخدم اللغة المكتشفة أو العربية كافتراضي
    const initialLng = detectedLng.includes('ar') ? 'ar' : 'en';
    
    initI18next(initialLng);
});
