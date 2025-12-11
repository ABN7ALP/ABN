
const deepl = require('deepl-node');
const { createClient } = require('redis');

// إعداد DeepL Translator
const authKey = process.env.DEEPL_API_KEY;
if (!authKey) {
    console.warn('⚠️ DEEPL_API_KEY is not set. Dynamic translation will be disabled.');
}
const translator = authKey ? new deepl.Translator(authKey) : null;

// إعداد Redis Client
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
// لا ننتظر الاتصال هنا، المكتبة ستتعامل معه
if (!redisClient.isOpen) {
    redisClient.connect();
}

const CACHE_EXPIRATION_SECONDS = 60 * 60 * 24; // تخزين الترجمة لمدة 24 ساعة

/**
 * يترجم نصاً واحداً باستخدام التخزين المؤقت.
 * @param {string} text - النص المراد ترجمته (يفترض أنه بالعربية).
 * @param {string} targetLang - اللغة الهدف ('en-US' أو 'tr').
 * @returns {Promise<string>} النص المترجم.
 */
async function translateText(text, targetLang) {
    if (!text || !translator || !targetLang || targetLang.startsWith('ar')) {
        return text;
    }

    const cacheKey = `translation:${targetLang}:${text}`;

    try {
        const cachedTranslation = await redisClient.get(cacheKey);
        if (cachedTranslation) {
            return cachedTranslation;
        }

        const result = await translator.translateText(text, 'ar', targetLang);
        const translatedText = result.text;

        await redisClient.set(cacheKey, translatedText, { EX: CACHE_EXPIRATION_SECONDS });

        return translatedText;
    } catch (error) {
        console.error(`Translation Error for text "${text}":`, error);
        return text; // أرجع النص الأصلي في حال حدوث خطأ
    }
}

/**
 * يترجم مصفوفة من الكائنات (مثل الخدمات أو العروض).
 * @param {Array<Object>} items - مصفوفة الكائنات.
 * @param {Array<string>} fieldsToTranslate - أسماء الحقول المراد ترجمتها (مثل ['name', 'description']).
 * @param {string} targetLang - اللغة الهدف.
 * @returns {Promise<Array<Object>>} مصفوفة الكائنات المترجمة.
 */
async function translateItems(items, fieldsToTranslate, targetLang) {
    if (!items || !translator || !targetLang || targetLang.startsWith('ar')) {
        return items;
    }

    const translatedItems = await Promise.all(
        items.map(async (item) => {
            const translatedItem = { ...item };
            for (const field of fieldsToTranslate) {
                if (item[field]) {
                    translatedItem[field] = await translateText(item[field], targetLang);
                }
            }
            return translatedItem;
        })
    );

    return translatedItems;
}

module.exports = { translateText, translateItems };
