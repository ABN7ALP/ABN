// public/i18n.js (النسخة النهائية)

function updateStaticContent() {
    if (!window.i18next || !window.i18next.t) return;
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

function changeLanguage(lng) {
    localStorage.setItem('i18nextLng', lng);
    window.location.reload();
}

function setupLanguageSwitcher(currentLng) {
    const switcherContainer = document.getElementById('language-switcher');
    if (!switcherContainer) return;

    const languages = {
        ar: { name: 'العربية', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/sa.svg' },
        en: { name: 'English', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/gb.svg' },
        tr: { name: 'Türkçe', flag: 'https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/tr.svg' }
    };

    const currentLangData = languages[currentLng];
    if (!currentLangData) return;

    switcherContainer.innerHTML = `
        <button class="language-dropdown-toggle">
            <img src="${currentLangData.flag}" alt="${currentLangData.name}" class="flag-icon">
            <span>${currentLangData.name}</span>
            <i class="ph-bold ph-caret-down"></i>
        </button>
        <div class="language-dropdown-menu"></div>
    `;

    const menu = switcherContainer.querySelector('.language-dropdown-menu');
    Object.keys(languages).forEach(lng => {
        if (lng !== currentLng) {
            const langData = languages[lng];
            const item = document.createElement('a');
            item.href = '#';
            item.dataset.lang = lng;
            item.innerHTML = `<img src="${langData.flag}" alt="${langData.name}" class="flag-icon"> ${langData.name}`;
            item.onclick = (e) => {
                e.preventDefault();
                changeLanguage(lng);
            };
            menu.appendChild(item);
        }
    });

    switcherContainer.querySelector('.language-dropdown-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        switcherContainer.classList.toggle('active');
    });
}

async function initializeLocalization() {
    const detector = new i18nextBrowserLanguageDetector();
    const detectedLng = detector.detect(['localStorage', 'navigator']);
    let currentLng = 'ar';
    if (detectedLng) {
        if (detectedLng.startsWith('en')) currentLng = 'en';
        else if (detectedLng.startsWith('tr')) currentLng = 'tr';
    }
    
    // 🚀 تم إزالة السطر الذي يغير اتجاه الصفحة من هنا
    document.documentElement.lang = currentLng;

    try {
        const response = await fetch(`./locales/${currentLng}/translation.json`);
        const translations = await response.json();

        await i18next.init({
            lng: currentLng,
            resources: { [currentLng]: { translation: translations } }
        });

        updateStaticContent();
        setupLanguageSwitcher(currentLng);

    } catch (error) {
        console.error("Localization Error:", error);
    }
}

document.addEventListener('DOMContentLoaded', initializeLocalization);

document.addEventListener('click', (e) => {
    const switcher = document.getElementById('language-switcher');
    if (switcher && !switcher.contains(e.target)) {
        switcher.classList.remove('active');
    }
});
