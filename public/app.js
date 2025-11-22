document.addEventListener('DOMContentLoaded', () => {
    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- المتغيرات العامة ---
    let servicesData = {}, currentPlatform = null, userInfo = null, currentOrderData = {};

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
    const depositPopupOverlay = document.getElementById('deposit-popup-overlay');
    const closeDepositPopupBtn = document.getElementById('close-deposit-popup-btn');
    const depositForm = document.getElementById('deposit-form');
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    const paymentDetailsContainer = document.getElementById('payment-details-container');
    const depositFormResponse = document.getElementById('deposit-form-response');
    const paymentOptionsContainer = document.getElementById('payment-options-container');
    const finalPriceDisplay = document.getElementById('final-price-display');
    const payWithBalanceBtn = document.getElementById('pay-with-balance-btn');
    const payWithWhatsappBtn = document.getElementById('pay-with-whatsapp-btn');
    const balanceError = document.getElementById('balance-error');

    // --- 2. نظام المصادقة والقائمة المنسدلة ---
    function updateUIForAuth() {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            userInfo = JSON.parse(storedUser);
            mainNav.innerHTML = `
                <div class="user-dropdown">
                    <div class="user-dropdown-toggle">
                        <i class="ph-bold ph-user-circle"></i>
                        <span>${userInfo.username}</span>
                        <i class="ph-bold ph-caret-down"></i>
                    </div>
                    <div class="user-dropdown-menu">
                        <div class="user-dropdown-header">
                            <h4>رصيدك الحالي</h4>
                            <div class="balance-display">
                                <i class="ph-bold ph-wallet"></i>
                                <span>${(userInfo.balance || 0).toFixed(2)} $</span>
                            </div>
                        </div>
                        <a href="#" id="add-balance-link"><i class="ph-bold ph-plus-circle"></i> شحن الرصيد</a>
                        <button id="logout-btn" class="logout-link"><i class="ph-bold ph-sign-out"></i> تسجيل الخروج</button>
                    </div>
                </div>
            `;
            document.querySelector('.user-dropdown-toggle').addEventListener('click', () => {
                document.querySelector('.user-dropdown').classList.toggle('active');
            });
            document.getElementById('logout-btn').addEventListener('click', logoutHandler);
            document.getElementById('add-balance-link').addEventListener('click', (e) => {
                e.preventDefault();
                showDepositPopup();
                document.querySelector('.user-dropdown').classList.remove('active');
            });
        } else {
            userInfo = null;
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
        loginFormContainer.classList.toggle('hidden', formType !== 'login');
        registerFormContainer.classList.toggle('hidden', formType !== 'register');
        authPopupOverlay.classList.remove('hidden');
    }

    function hideAuthPopup() { authPopupOverlay.classList.add('hidden'); }

    async function loginHandler(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'فشل تسجيل الدخول');
            localStorage.setItem('userInfo', JSON.stringify(data));
            hideAuthPopup();
            updateUIForAuth();
        } catch (error) { loginPopupError.textContent = error.message; }
    }

    async function registerHandler(e) {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'فشل إنشاء الحساب');
            localStorage.setItem('userInfo', JSON.stringify(data));
            hideAuthPopup();
            updateUIForAuth();
        } catch (error) { registerPopupError.textContent = error.message; }
    }

    function logoutHandler() {
        localStorage.removeItem('userInfo');
        updateUIForAuth();
    }

    async function refreshUserData() {
        if (!userInfo || !userInfo._id) return;
        try {
            const response = await fetch(`/api/auth/me?userId=${userInfo._id}`);
            if (!response.ok) { logoutHandler(); return; }
            const updatedUser = await response.json();
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));
            userInfo = updatedUser;
            updateUIForAuth();
        } catch (error) { console.error('Failed to refresh user data:', error); }
    }

    // --- 3. نظام شحن الرصيد ---
    function showDepositPopup() {
        depositForm.reset();
        depositFormResponse.textContent = '';
        depositFormResponse.className = 'form-message';
        paymentDetailsContainer.classList.add('hidden');
        paymentMethodBtns.forEach(btn => btn.classList.remove('active'));
        depositPopupOverlay.classList.remove('hidden');
    }

    function hideDepositPopup() { depositPopupOverlay.classList.add('hidden'); }

    function handlePaymentMethodSelect(event) {
        const selectedMethod = event.currentTarget.dataset.method;
        paymentMethodBtns.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        let detailsHTML = '';
        switch (selectedMethod) {
            case 'bank': detailsHTML = `<p>يرجى تحويل المبلغ إلى الحساب التالي:</p><p>الاسم: <span>BESSAR</span></p><p>رقم الحساب (IBAN): <span>TR9785431312751367319</span></p>`; break;
            case 'sham': detailsHTML = `<p>يرجى مسح الباركود التالي والدفع عبر شام كاش:</p><img src="https://i.ibb.co/GvXw59R/bfa34fae23d4f3b4089e6d615bbd07d7.png" alt="Sham Cash QR Code">`; break;
            case 'whatsapp': detailsHTML = `<p>للحوالة عبر مكتب، يرجى التواصل معنا عبر واتساب للحصول على التفاصيل. بعد إتمام الحوالة، قم برفع صورة الإيصال هنا.</p>`; break;
        }
        paymentDetailsContainer.innerHTML = detailsHTML;
        paymentDetailsContainer.classList.remove('hidden');
    }

    async function handleDepositSubmit(event) {
        event.preventDefault();
        depositFormResponse.textContent = 'جاري إرسال الطلب...';
        depositFormResponse.className = 'form-message';
        const receiptFile = document.getElementById('deposit-receipt').files[0];
        const selectedMethod = document.querySelector('.payment-method-btn.active');
        if (!selectedMethod) { depositFormResponse.textContent = 'الرجاء اختيار طريقة الدفع.'; depositFormResponse.className = 'form-message error'; return; }
        if (!receiptFile) { depositFormResponse.textContent = 'الرجاء رفع صورة الإيصال.'; depositFormResponse.className = 'form-message error'; return; }
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        try {
            const imageBase64 = await toBase64(receiptFile);
            const depositData = { userId: userInfo._id, amount: document.getElementById('deposit-amount').value, depositorName: document.getElementById('depositor-name').value, method: selectedMethod.dataset.method, receiptImage: imageBase64 };
            const response = await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(depositData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل إرسال الطلب.');
            depositFormResponse.textContent = result.message;
            depositFormResponse.className = 'form-message success';
            setTimeout(hideDepositPopup, 3000);
        } catch (error) {
            depositFormResponse.textContent = error.message;
            depositFormResponse.className = 'form-message error';
        }
    }

    // --- 4. تحميل وعرض الخدمات ---
    async function loadServices() {
        try {
            const response = await fetch('/api/services');
            if (!response.ok) throw new Error('Network response was not ok');
            const servicesFromDB = await response.json();
            servicesData = servicesFromDB.reduce((acc, service) => {
                const platform = service.platform;
                if (!acc[platform]) { acc[platform] = { icon: getPlatformIcon(platform), description: `خدمات متنوعة لمنصة ${platform}`, validation: getPlatformValidation(platform), services: [] }; }
                acc[platform].services.push(service);
                return acc;
            }, {});
            renderServiceCards();
        } catch (error) {
            console.error("Failed to load services from API:", error);
            servicesContainer.innerHTML = '<p style="color:white; text-align:center;">فشل تحميل الخدمات. يرجى المحاولة مرة أخرى.</p>';
        }
    }

    // ******** الدوال الصحيحة والمحدثة هنا ********
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
        try {
            const initial = encodeURIComponent(platform.charAt(0).toUpperCase());
            return `https://ui-avatars.com/api/?name=${initial}&background=random&size=50&color=fff`;
        } catch (e) { return ''; }
    }

    function getPlatformValidation(platform) {
        const p = platform.toLowerCase().trim();
        if (p.includes('instagram') || p.includes('انستغرام') || p.includes('انستا')) return /instagram\.com/;
        if (p.includes('tiktok') || p.includes('تيك توك')) return /tiktok\.com/;
        if (p.includes('twitter') || p.includes('تويتر') || p === 'x') return /(twitter|x)\.com/;
        if (p.includes('facebook') || p.includes('فيس بوك') || p.includes('فيس')) return /facebook\.com/;
        if (p.includes('youtube') || p.includes('يوتيوب')) return /(youtube\.com|youtu\.be)/;
        if (p.includes('telegram') || p.includes('تلغرام')) return /(telegram\.me|t\.me)/;
        if (p.includes('snapchat') || p.includes('سناب شات')) return /snapchat\.com/;
        if (p.includes('threads') || p.includes('ثريدز')) return /threads\.net/;
        return new RegExp(`${p.replace(/\s/g, '')}\\.com`, 'i');
    }
    // ******** نهاية الدوال الصحيحة ********

    function renderServiceCards() {
        servicesContainer.innerHTML = '';
        if (Object.keys(servicesData).length === 0) { servicesContainer.innerHTML = '<p style="color:white; text-align:center;">لا توجد خدمات متاحة حالياً.</p>'; return; }
        for (const platform in servicesData) {
            const data = servicesData[platform];
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `<div class="icon-wrapper"><img src="${data.icon}" alt="${platform} icon" onerror="this.style.display='none'"></div><h3>${platform}</h3><p>${data.description}</p><button class="pill-button get-button"><i class="ph-bold ph-arrow-circle-right"></i><span>اطلب الآن</span></button>`;
            card.addEventListener('click', () => showOrderForm(platform));
            servicesContainer.appendChild(card);
        }
    }

    // --- 5. إظهار وتحديث نموذج الطلب ---
    function showOrderForm(platform) {
        refreshUserData();
        currentPlatform = platform;
        orderFormContainer.classList.remove('hidden');
        successMessageContainer.classList.add('hidden');
        paymentOptionsContainer.classList.add('hidden');
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
        if (isNaN(quantity) || quantity <= 0) { priceDisplay.textContent = '0.00 $'; return; }
        const totalPrice = (quantity / 1000) * pricePer1000;
        priceDisplay.textContent = `${totalPrice.toFixed(2)} $`;
    }

    function validateLink() {
        const link = linkInput.value;
        const platformData = servicesData[currentPlatform];
        if (platformData && link.length > 0 && !platformData.validation.test(link)) {
            linkError.textContent = `الرابط غير صحيح. يجب أن يكون رابط ${currentPlatform}.`;
            return false;
        }
        linkError.textContent = '';
        return true;
    }

    // --- 6. معالجة إرسال الطلب وخيارات الدفع ---
    function handleFormSubmit(event) {
        event.preventDefault();
        if (!validateLink()) { alert('الرجاء إدخال رابط صحيح.'); return; }
        currentOrderData = { platform: currentPlatform, service: serviceSelect.value, link: linkInput.value, quantity: parseInt(quantityInput.value, 10), price: parseFloat(priceDisplay.textContent.replace(' $', '')), userId: userInfo ? userInfo._id : null };
        orderFormContainer.classList.add('hidden');
        paymentOptionsContainer.classList.remove('hidden');
        finalPriceDisplay.textContent = `${currentOrderData.price.toFixed(2)} $`;
        balanceError.textContent = '';
        if (userInfo && userInfo.balance >= currentOrderData.price) {
            payWithBalanceBtn.disabled = false;
        } else {
            payWithBalanceBtn.disabled = true;
            balanceError.textContent = userInfo ? 'رصيدك الحالي غير كافٍ.' : 'سجل الدخول للدفع بالرصيد.';
        }
    }

    async function executePayWithBalance() {
        try {
            const response = await fetch('/api/orders/pay-with-balance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentOrderData) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل الدفع بالرصيد.');
            userInfo.balance = result.newBalance;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            updateUIForAuth();
            paymentOptionsContainer.classList.add('hidden');
            formResponse.textContent = 'تم الدفع بنجاح! طلبك الآن قيد التنفيذ.';
            successMessageContainer.classList.remove('hidden');
        } catch (error) {
            balanceError.textContent = error.message;
        }
    }

    async function executePayWithWhatsapp() {
        const orderDataForWhatsapp = { ...currentOrderData, user: userInfo ? userInfo._id : null };
        try {
            await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderDataForWhatsapp) });
        } catch (error) { console.error("Failed to save order to DB, but proceeding.", error); }
        const message = `*طلب جديد* 🎉\n---------------------\n*المنصة:* ${orderDataForWhatsapp.platform}\n*الخدمة:* ${orderDataForWhatsapp.service}\n*الكمية:* ${orderDataForWhatsapp.quantity}\n*السعر:* ${orderDataForWhatsapp.price.toFixed(2)}$\n*الرابط:* ${orderDataForWhatsapp.link}\n---------------------\n(رسالة منشأة تلقائياً)`;
        const adminPhoneNumber = "905367893256";
        const encodedMessage = encodeURIComponent(message.trim());
        const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodedMessage}`;
        paymentOptionsContainer.classList.add('hidden');
        formResponse.textContent = 'ممتاز! سيتم الآن تحويلك إلى واتساب.';
        successMessageContainer.classList.remove('hidden');
        setTimeout(() => { window.open(whatsappUrl, '_blank'); hidePopup(); }, 2500);
    }

    function hidePopup() { orderPopupOverlay.classList.add('hidden'); }

    // --- 7. ربط الأحداث ---
    closePopupButton.addEventListener('click', hidePopup);
    successOkButton.addEventListener('click', () => {
        hidePopup();
        setTimeout(() => {
            orderFormContainer.classList.remove('hidden');
            successMessageContainer.classList.add('hidden');
            paymentOptionsContainer.classList.add('hidden');
        }, 500);
    });
    orderPopupOverlay.addEventListener('click', (e) => { if (e.target === orderPopupOverlay) hidePopup(); });
    serviceSelect.addEventListener('change', updateFormBasedOnService);
    quantityInput.addEventListener('input', updatePrice);
    linkInput.addEventListener('input', validateLink);
    orderForm.addEventListener('submit', handleFormSubmit);
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPopup('register'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showAuthPopup('login'); });
    loginFormPopup.addEventListener('submit', loginHandler);
    registerFormPopup.addEventListener('submit', registerHandler);
    authPopupOverlay.addEventListener('click', (e) => { if (e.target === authPopupOverlay || e.target.closest('.close-btn')) hideAuthPopup(); });
    closeDepositPopupBtn.addEventListener('click', hideDepositPopup);
    depositPopupOverlay.addEventListener('click', (e) => { if (e.target === depositPopupOverlay) hideDepositPopup(); });
    paymentMethodBtns.forEach(btn => btn.addEventListener('click', handlePaymentMethodSelect));
    depositForm.addEventListener('submit', handleDepositSubmit);
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.user-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
    payWithBalanceBtn.addEventListener('click', executePayWithBalance);
    payWithWhatsappBtn.addEventListener('click', executePayWithWhatsapp);

    // --- 8. الاستماع للتحديثات الفورية (Socket.IO) ---
    socket.on('new-service', () => {
        console.log('New service detected! Reloading services...');
        loadServices();
    });

    socket.on('deposit-approved', (data) => {
        if (userInfo && userInfo._id === data.userId) {
            console.log('Your deposit was approved! Refreshing user data...');
            refreshUserData();
        }
    });

    // --- 9. البدء بتشغيل كل شيء ---
    updateUIForAuth();
    loadServices();
});
