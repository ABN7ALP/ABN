// دالة لتحديث المحتوى الثابت بناءً على الترجمات
function updateStaticContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const value = i18next.t(key);
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.hasAttribute('placeholder')) element.placeholder = value;
            } else {
                element.innerHTML = value;
            }
        }
    });
}

// دالة لتغيير اللغة
function changeLanguage(lng) {
    localStorage.setItem('i18nextLng', lng);
    // إعادة تحميل الصفحة لتطبيق اللغة على كل شيء (بما في ذلك البيانات من الخادم)
    window.location.reload();
}

// دالة إعداد زر تبديل اللغة
function setupLanguageSwitcher(currentLng) {
    const switcherContainer = document.getElementById('language-switcher');
    if (!switcherContainer) return;

    const languages = {
        ar: { name: 'العربية', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/sa.svg' },
        en: { name: 'English', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/gb.svg' },
        tr: { name: 'Türkçe', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/tr.svg' }
    };

    // إنشاء الزر الحالي
    const currentLang = languages[currentLng];
    switcherContainer.innerHTML = `
        <button class="language-dropdown-toggle">
            <img src="${currentLang.flag}" alt="${currentLang.name}" class="flag-icon">
            <span>${currentLang.name}</span>
            <i class="ph-bold ph-caret-down"></i>
        </button>
        <div class="language-dropdown-menu"></div>
    `;

    // ملء القائمة المنسدلة باللغات الأخرى
    const menu = switcherContainer.querySelector('.language-dropdown-menu');
    Object.keys(languages).forEach(lng => {
        if (lng !== currentLng) {
            const lang = languages[lng];
            const item = document.createElement('a');
            item.href = '#';
            item.dataset.lang = lng;
            item.innerHTML = `<img src="${lang.flag}" alt="${lang.name}" class="flag-icon"> ${lang.name}`;
            item.onclick = (e) => {
                e.preventDefault();
                changeLanguage(lng);
            };
            menu.appendChild(item);
        }
    });

    // تفعيل/إلغاء تفعيل القائمة المنسدلة
    switcherContainer.querySelector('.language-dropdown-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        switcherContainer.classList.toggle('active');
    });
}

// دالة التهيئة الرئيسية
async function initializeLocalization() {
    // 1. تحديد اللغة (من localStorage أو المتصفح أو الافتراضي 'ar')
    const detector = new i18nextBrowserLanguageDetector();
    const detectedLng = detector.detect(['localStorage', 'navigator']);
    let currentLng = 'ar'; // الافتراضي
    if (detectedLng) {
        if (detectedLng.startsWith('en')) currentLng = 'en';
        else if (detectedLng.startsWith('tr')) currentLng = 'tr';
        else if (detectedLng.startsWith('ar')) currentLng = 'ar';
    }
    
    // 2. تحديث اتجاه الصفحة
    document.documentElement.lang = currentLng;
    document.documentElement.dir = currentLng === 'ar' ? 'rtl' : 'ltr';

    // 3. تحميل ملف الترجمة للنصوص الثابتة
    try {
        const response = await fetch(`./locales/${currentLng}/translation.json`);
        const translations = await response.json();

        await i18next.init({
            lng: currentLng,
            resources: { [currentLng]: { translation: translations } }
        });

        // 4. تطبيق الترجمات وإعداد الزر
        updateStaticContent();
        setupLanguageSwitcher(currentLng);

    } catch (error) {
        console.error("Localization Error:", error);
    }
}

// بدء كل شيء
document.addEventListener('DOMContentLoaded', initializeLocalization);

// إغلاق القائمة عند النقر خارجها
document.addEventListener('click', (e) => {
    const switcher = document.getElementById('language-switcher');
    if (switcher && !switcher.contains(e.target)) {
        switcher.classList.remove('active');
    }
});
