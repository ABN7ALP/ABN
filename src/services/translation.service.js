src/services/translation.service.js

const deepl = require('deepl-node');
const { createClient } = require('redis');

// 1. إعداد DeepL
const authKey = process.env.DEEPL_API_KEY;
if (!authKey) {
    console.warn('⚠️ DEEPL_API_KEY is not set. Dynamic translation will be disabled.');
}
const translator = authKey ? new deepl.Translator(authKey) : null;

// 2. إعداد Redis Caching
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect();

const CACHE_EXPIRATION_SECONDS = 60 * 60 * 24; // تخزين الترجمة لمدة 24 ساعة

/**
 * دالة ذكية لترجمة نص.
 * تبحث أولاً في الـ Cache، وإذا لم تجد الترجمة، تستدعي API ثم تخزن النتيجة.
 * @param {string} text - النص المراد ترجمته (يجب أن يكون بالعربية).
 * @param {string} targetLang - اللغة الهدف (مثل 'en-US').
 * @returns {Promise<string>} النص المترجم.
 */
async function translateText(text, targetLang = 'en-US') {
    // إذا لم يكن هناك نص أو كانت اللغة الهدف هي العربية، أرجع النص الأصلي
    if (!text || targetLang.startsWith('ar')) {
        return text;
    }

    // إذا لم يكن مفتاح API متاحاً، أرجع النص الأصلي
    if (!translator) {
        return text;
    }

    const cacheKey = `translation:${targetLang}:${text}`;

    try {
        // 3. البحث في الـ Cache أولاً
        const cachedTranslation = await redisClient.get(cacheKey);
        if (cachedTranslation) {
            console.log(`CACHE HIT: Found translation for "${text}" in Redis.`);
            return cachedTranslation;
        }

        console.log(`CACHE MISS: Translating "${text}" using DeepL API.`);
        
        // 4. إذا لم نجدها، قم بالترجمة باستخدام DeepL
        const result = await translator.translateText(text, 'ar', targetLang);
        const translatedText = result.text;

        // 5. تخزين الترجمة الجديدة في Redis
        await redisClient.set(cacheKey, translatedText, {
            EX: CACHE_EXPIRATION_SECONDS,
        });

        return translatedText;

    } catch (error) {
        console.error('Translation Error:', error);
        // في حال حدوث خطأ في الترجمة، أرجع النص الأصلي لتجنب تعطل الموقع
        return text;
    }
}

module.exports = { translateText };
