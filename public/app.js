document.addEventListener('DOMContentLoaded', () => {
    // --- المتغيرات العامة ---
    let servicesData = {};
    let currentPlatform = null;
    let userInfo = null;

    // --- عناصر الصفحة ---
    const servicesContainer = document.getElementById('services-container');
    const orderPopupOverlay = document.getElementById('order-popup-overlay');
    const closePopupButton = document.getElementById('close-popup-btn');
    const successOkButton = document.getElementById('success-ok-btn');
    const orderFormContainer = document.getElementById('order-form-container');
    const successMessageContainer = document.getElementById('success-message-container');
    const formTitle = document.getElementById('form-title');
    const popupIcon = document.getElementById('popup-icon');
    const serviceSelect = document.getElementById('service-select');
    const linkInput = document.getElementById('link-input');
    const linkError = document.getElementById('link-error');
    const quantityInput = document.getElementById('quantity-input');
    const priceDisplay = document.getElementById('price-display');
    const orderForm = document.getElementById('order-form');
    const formResponse = document.getElementById('form-response');

    // عناصر المصادقة (الجديدة)
    const mainNav = document.getElementById('main-nav');
    const authPopupOverlay = document.getElementById('auth-popup-overlay');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginFormPopup = document.getElementById('login-form-popup');
    const registerFormPopup = document.getElementById('register-form-popup');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginPopupError = document.getElementById('login-popup-error');
    const registerPopupError = document.getElementById('register-popup-error');

    // --- 1. نظام المصادقة (Authentication) ---

    function updateUIForAuth() {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            userInfo = JSON.parse(storedUser);
            mainNav.innerHTML = `
                <div class="user-menu">
                    <span>أهلاً، ${userInfo.username}</span>
                    <button id="logout-btn" class="pill-button secondary-button">تسجيل الخروج</button>
                </div>
            `;
            document.getElementById('logout-btn').addEventListener('click', logoutHandler);
        } else {
            mainNav.innerHTML = `
                <button id="login-btn" class="pill-button secondary-button">تسجيل الدخول</button>
                <button id="register-btn" class="pill-button primary-button">إنشاء حساب</button>
            `;
            document.getElementById('login-btn').addEventListener('click', () => showAuthPopup('login'));
            document.getElementById('register-btn').addEventListener('click', () => showAuthPopup('register'));
        }
    }

    function showAuthPopup(formType) {
        loginPopupError.textContent = '';
        registerPopupError.textContent = '';
        if (formType === 'login') {
            loginFormContainer.classList.remove('hidden');
            registerFormContainer.classList.add('hidden');
        } else {
            registerFormContainer.classList.remove('hidden');
            loginFormContainer.classList.add('hidden');
        }
        authPopupOverlay.classList.remove('hidden');
    }

    function hideAuthPopup() {
        authPopupOverlay.classList.add('hidden');
    }

    async function loginHandler(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'فشل تسجيل الدخول');
            localStorage.setItem('userInfo', JSON.stringify(data));
            hideAuthPopup();
            updateUIForAuth();
        } catch (error) {
            loginPopupError.textContent = error.message;
        }
    }

    async function registerHandler(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'فشل إنشاء الحساب');
            localStorage.setItem('userInfo', JSON.stringify(data));
            hideAuthPopup();
            updateUIForAuth();
        } catch (error) {
            registerPopupError.textContent = error.message;
        }
    }

    function logoutHandler() {
        localStorage.removeItem('userInfo');
        userInfo = null;
        updateUIForAuth();
    }

    // --- 2. تحميل وعرض الخدمات ---
    async function loadServices() {
        try {
            const response = await fetch('/api/services');
            const servicesFromDB = await response.json();
            servicesData = servicesFromDB.reduce((acc, service) => {
                const platform = service.platform;
                if (!acc[platform]) {
                    acc[platform] = {
                        icon: getPlatformIcon(platform),
                        description: `خدمات متنوعة لمنصة ${platform}`,
                        validation: getPlatformValidation(platform),
                        services: []
                    };
                }
                acc[platform].services.push(service);
                return acc;
            }, {});
            renderServiceCards();
        } catch (error) {
            console.error("Failed to load services from API:", error);
            servicesContainer.innerHTML = '<p style="color:white; text-align:center;">فشل تحميل الخدمات. يرجى المحاولة مرة أخرى.</p>';
        }
    }

    function getPlatformIcon(platform) {
        const p = platform.toLowerCase().trim();
        if (p.includes('instagram') || p.includes('انستغرام') || p.includes('انستا')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
        if (p.includes('tiktok') || p.includes('تيك توك')) return 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg';
        if (p.includes('twitter') || p.includes('تويتر') || p === 'x') return 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg';
        if (p.includes('facebook') || p.includes('فيس بوك') || p.includes('فيس')) return 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg';
        if (p.includes('youtube') || p.includes('يوتيوب')) return 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg';
        if (p.includes('telegram') || p.includes('تلغرام')) return 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg';
        if (p.includes('snapchat') || p.includes('سناب شات')) return 'https://upload.wikimedia.org/wikipedia/en/c/c4/Snapchat_logo.svg';
        if (p.includes('threads') || p.includes('ثريدز')) return 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Threads_app_icon.svg';
        return `https://via.placeholder.com/50?text=${platform.charAt(0)}`;
    }

    function getPlatformValidation(platform) {
        const p = platform.toLowerCase().trim();
        if (p.includes('instagram') || p.includes('انستغرام')) return /instagram\.com/;
        if (p.includes('tiktok') || p.includes('تيك توك')) return /tiktok\.com/;
        if (p.includes('twitter') || p.includes('تويتر') || p === 'x') return /(twitter|x)\.com/;
        if (p.includes('facebook') || p.includes('فيس بوك')) return /facebook\.com/;
        if (p.includes('youtube') || p.includes('يوتيوب')) return /(youtube\.com|youtu\.be)/;
        if (p.includes('telegram') || p.includes('تلغرام')) return /(telegram\.me|t\.me)/;
        if (p.includes('snapchat') || p.includes('سناب شات')) return /snapchat\.com/;
        if (p.includes('threads') || p.includes('ثريدز')) return /threads\.net/;
        return new RegExp(`${p.replace(/\s/g, '')}\\.com`, 'i');
    }

    function renderServiceCards() {
        servicesContainer.innerHTML = '';
        if (Object.keys(servicesData).length === 0) {
            servicesContainer.innerHTML = '<p style="color:white; text-align:center;">لا توجد خدمات متاحة حالياً.</p>';
            return;
        }
        for (const platform in servicesData) {
            const data = servicesData[platform];
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `<div class="icon-wrapper"><img src="${data.icon}" alt="${platform} icon"></div><h3>${platform}</h3><p>${data.description}</p><button class="pill-button get-button"><i class="ph-bold ph-arrow-circle-right"></i><span>اطلب الآن</span></button>`;
            card.addEventListener('click', () => showOrderForm(platform));
            servicesContainer.appendChild(card);
        }
    }

    // --- 3. إظهار وتحديث نموذج الطلب ---
    function showOrderForm(platform) {
        currentPlatform = platform;
        orderFormContainer.classList.remove('hidden');
        successMessageContainer.classList.add('hidden');
        formTitle.textContent = `طلب خدمة لـ ${platform}`;
        const iconName = platform.toLowerCase().replace(/\s/g, '');
        popupIcon.className = `ph-bold ph-${iconName}-logo`;
        serviceSelect.innerHTML = '';
        servicesData[platform].services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.dataset.price = service.pricePer1000;
            option.dataset.min = service.min;
            option.dataset.max = service.max;
            option.textContent = `${service.name}`;
            serviceSelect.appendChild(option);
        });
        orderForm.reset();
        linkError.textContent = '';
        orderPopupOverlay.classList.remove('hidden');
        updateFormBasedOnService();
    }

    function updateFormBasedOnService() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return;
        const min = selectedOption.dataset.min;
        const max = selectedOption.dataset.max;
        quantityInput.min = min;
        quantityInput.max = max;
        quantityInput.value = Math.max(1000, min);
        quantityInput.placeholder = `الكمية (بين ${min} و ${max})`;
        updatePrice();
    }

    function updatePrice() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return;
        const pricePer1000 = parseFloat(selectedOption.dataset.price);
        const quantity = parseInt(quantityInput.value, 10);
        if (isNaN(quantity) || quantity <= 0) {
            priceDisplay.textContent = '0.00 $';
            return;
        }
        const totalPrice = (quantity / 1000) * pricePer1000;
        priceDisplay.textContent = `${totalPrice.toFixed(2)} $`;
    }

    function validateLink() {
        const link = linkInput.value;
        const platformData = servicesData[currentPlatform];
        if (platformData && link.length > 0 && !platformData.validation.test(link)) {
            linkError.textContent = `الرابط غير صحيح. يجب أن يكون رابط ${currentPlatform}.`;
            return false;
        } else {
            linkError.textContent = '';
            return true;
        }
    }

    // --- 4. معالجة إرسال الطلب ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        if (!validateLink()) {
            alert('الرجاء إدخال رابط صحيح.');
            return;
        }
        const orderData = {
            platform: currentPlatform,
            service: serviceSelect.value,
            link: linkInput.value,
            quantity: parseInt(quantityInput.value, 10),
            price: parseFloat(priceDisplay.textContent.replace(' $', '')),
            user: userInfo ? userInfo._id : null // ربط الطلب بالمستخدم
        };
        try {
            await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });
        } catch (error) {
            console.error("Failed to save order to DB, but proceeding with WhatsApp link.", error);
        }
        const message = `*طلب جديد* 🎉\n---------------------\n*المنصة:* ${orderData.platform}\n*الخدمة:* ${orderData.service}\n*الكمية:* ${orderData.quantity}\n*السعر:* ${orderData.price}$\n*الرابط:* ${orderData.link}\n---------------------\n(رسالة منشأة تلقائياً)`;
        const adminPhoneNumber = "905367893256";
        const encodedMessage = encodeURIComponent(message.trim());
        const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodedMessage}`;
        formResponse.textContent = 'ممتاز! سيتم الآن تحويلك إلى واتساب لإرسال تفاصيل طلبك.';
        orderFormContainer.classList.add('hidden');
        successMessageContainer.classList.remove('hidden');
        setTimeout(() => {
            window.open(whatsappUrl, '_blank');
            hidePopup();
        }, 2500);
    }

    function hidePopup() {
        orderPopupOverlay.classList.add('hidden');
    }

    // --- 5. ربط الأحداث ---
    closePopupButton.addEventListener('click', hidePopup);
    successOkButton.addEventListener('click', hidePopup);
    orderPopupOverlay.addEventListener('click', (e) => { if (e.target === orderPopupOverlay) hidePopup(); });
    serviceSelect.addEventListener('change', updateFormBasedOnService);
    quantityInput.addEventListener('input', updatePrice);
    linkInput.addEventListener('input', validateLink);
    orderForm.addEventListener('submit', handleFormSubmit);

    // أحداث المصادقة الجديدة
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPopup('register'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPopup('login'); });
    loginFormPopup.addEventListener('submit', loginHandler);
    registerFormPopup.addEventListener('submit', registerHandler);
    authPopupOverlay.addEventListener('click', (e) => {
        if (e.target === authPopupOverlay || e.target.closest('.close-btn')) {
            hideAuthPopup();
        }
    });

    // --- 6. البدء بتشغيل كل شيء ---
    updateUIForAuth();
    loadServices();
});
