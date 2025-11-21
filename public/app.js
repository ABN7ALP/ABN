document.addEventListener('DOMContentLoaded', () => {
    // --- المتغيرات العامة ---
    let servicesData = {}; // ستبدأ فارغة ويتم ملؤها من الـ API
    let currentPlatform = null;

    // --- عناصر الصفحة ---
    const servicesContainer = document.getElementById('services-container');
    const popupOverlay = document.getElementById('order-popup-overlay');
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

    // --- 1. تحميل الخدمات من قاعدة البيانات ---
    async function loadServices() {
        try {
            const response = await fetch('/api/services');
            const servicesFromDB = await response.json();
            
            // إعادة هيكلة البيانات للشكل الذي يتوقعه الكود
            servicesData = servicesFromDB.reduce((acc, service) => {
                const platform = service.platform;
                if (!acc[platform]) {
                    acc[platform] = {
                        icon: getPlatformIcon(platform),
                        description: `خدمات متنوعة لمنصة ${platform}`,
                        validation: new RegExp(`^(https?:\/\/)?(www\.)?${platform.toLowerCase().replace(/\s/g, '')}(\.com)?\/.+`),
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

    // دالة مساعدة لجلب أيقونات المنصات
    function getPlatformIcon(platform) {
        const p = platform.toLowerCase();
        if (p.includes('instagram')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
        if (p.includes('tiktok')) return 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg';
        if (p.includes('twitter') || p.includes('x')) return 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg';
        if (p.includes('facebook')) return 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg';
        // أيقونة افتراضية
        return `https://via.placeholder.com/50?text=${platform.charAt(0)}`;
    }

    // --- 2. عرض بطاقات الخدمات ---
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
            card.innerHTML = `
                <div class="icon-wrapper">
                    <img src="${data.icon}" alt="${platform} icon">
                </div>
                <h3>${platform}</h3>
                <p>${data.description}</p>
                <button class="pill-button get-button">
                    <i class="ph-bold ph-arrow-circle-right"></i>
                    <span>اطلب الآن</span>
                </button>
            `;
            card.addEventListener('click', () => showOrderForm(platform));
            servicesContainer.appendChild(card);
        }
    }

    // --- 3. إظهار نموذج الطلب ---
    function showOrderForm(platform) {
        currentPlatform = platform;
        orderFormContainer.classList.remove('hidden');
        successMessageContainer.classList.add('hidden');
        formTitle.textContent = `طلب خدمة لـ ${platform}`;
        popupIcon.className = `ph-bold ph-${platform.toLowerCase().replace(/\s/g, '')}-logo`;

        serviceSelect.innerHTML = '';
        servicesData[platform].services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            // تخزين كل بيانات الخدمة في الـ option
            option.dataset.price = service.pricePer1000;
            option.dataset.min = service.min;
            option.dataset.max = service.max;
            option.textContent = `${service.name}`;
            serviceSelect.appendChild(option);
        });

        orderForm.reset();
        linkError.textContent = '';
        popupOverlay.classList.remove('hidden');
        updateFormBasedOnService(); // تحديث النموذج بناءً على أول خدمة في القائمة
    }

    // --- 4. تحديث النموذج (السعر، الحدود، إلخ) ---
    function updateFormBasedOnService() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return;

        const min = selectedOption.dataset.min;
        const max = selectedOption.dataset.max;

        quantityInput.min = min;
        quantityInput.max = max;
        quantityInput.value = Math.max(quantityInput.value, min); // التأكد من أن القيمة الحالية ليست أقل من الحد الأدنى
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

    // --- 5. التحقق من الرابط ---
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

    // --- 6. معالجة إرسال الطلب (عبر واتساب) ---
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
            price: parseFloat(priceDisplay.textContent),
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
        popupOverlay.classList.add('hidden');
    }

    // --- ربط الأحداث ---
    closePopupButton.addEventListener('click', hidePopup);
    successOkButton.addEventListener('click', hidePopup);
    popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) hidePopup(); });
    serviceSelect.addEventListener('change', updateFormBasedOnService);
    quantityInput.addEventListener('input', updatePrice);
    linkInput.addEventListener('input', validateLink);
    orderForm.addEventListener('submit', handleFormSubmit);

    // --- البدء بتشغيل كل شيء ---
    loadServices();
});
