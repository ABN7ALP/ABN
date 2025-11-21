document.addEventListener('DOMContentLoaded', () => {
    // --- بيانات الخدمات ---
    const servicesData = {
        Instagram: {
            icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
            description: 'زيادة المتابعين، الإعجابات، والمشاهدات لحسابك في انستغرام.',
            validation: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/,
            services: [
                { name: 'متابعين', pricePer1000: 10.50 },
                { name: 'لايكات', pricePer1000: 5.00 },
                { name: 'مشاهدات فيديو', pricePer1000: 2.50 },
            ],
        },
        TikTok: {
            icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
            description: 'عزز وصولك على تيك توك عبر زيادة المتابعين والمشاهدات.',
            validation: /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/,
            services: [
                { name: 'متابعين', pricePer1000: 12.00 },
                { name: 'مشاهدات', pricePer1000: 1.50 },
                { name: 'لايكات', pricePer1000: 8.00 },
            ],
        },
        Twitter: {
            icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
            description: 'قم بزيادة تأثيرك على تويتر عبر خدمات المتابعة وإعادة التغريد.',
            validation: /^(https?:\/\/)?(www\.)?(twitter|x)\.com\/.+/,
            services: [
                { name: 'متابعين', pricePer1000: 15.00 },
                { name: 'إعادة تغريد', pricePer1000: 20.00 },
            ],
        },
    };

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
    const submitButton = orderForm.querySelector('button');

    let currentPlatform = null;
    let currentServicePrice = 0;

    // --- 1. عرض بطاقات الخدمات ---
    function renderServiceCards() {
        servicesContainer.innerHTML = '';
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

    // --- 2. إظهار نموذج الطلب في النافذة المنبثقة ---
    function showOrderForm(platform) {
        currentPlatform = platform;
        
        // إظهار فورم الطلب وإخفاء رسالة النجاح
        orderFormContainer.classList.remove('hidden');
        successMessageContainer.classList.add('hidden');

        formTitle.textContent = `طلب خدمة لـ ${platform}`;
        popupIcon.className = `ph-bold ph-${platform.toLowerCase()}-logo`;

        serviceSelect.innerHTML = '';
        servicesData[platform].services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.name;
            option.dataset.price = service.pricePer1000;
            option.textContent = `${service.name} (السعر: ${service.pricePer1000}$ لكل 1000)`;
            serviceSelect.appendChild(option);
        });

        orderForm.reset();
        linkError.textContent = '';
        popupOverlay.classList.remove('hidden');
        updatePrice();
    }

    // --- إخفاء النافذة المنبثقة ---
    function hidePopup() {
        popupOverlay.classList.add('hidden');
    }

    // --- 3. تحديث السعر ---
    function updatePrice() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return;

        currentServicePrice = parseFloat(selectedOption.dataset.price);
        const quantity = parseInt(quantityInput.value, 10);
        
        if (isNaN(quantity) || quantity <= 0) {
            priceDisplay.textContent = '0.00 $';
            return;
        }

        const totalPrice = (quantity / 1000) * currentServicePrice;
        priceDisplay.textContent = `${totalPrice.toFixed(2)} $`;
    }

    // --- 4. التحقق من الرابط ---
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

    // --- 5. معالجة إرسال الطلب ---
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

        submitButton.disabled = true;
        submitButton.innerHTML = `<span>جاري الإرسال...</span><i class="ph-bold ph-spinner-gap animate-spin"></i>`;

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });
            const result = await response.json();

            if (response.ok) {
                formResponse.textContent = result.message || 'تم استلام طلبك بنجاح!';
                orderFormContainer.classList.add('hidden');
                successMessageContainer.classList.remove('hidden');
            } else {
                alert(result.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى.');
            }
        } catch (error) {
            alert('فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.');
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = `<span>تأكيد الطلب</span><i class="ph-bold ph-shopping-cart-simple"></i>`;
            updatePrice();
        }
    }

    // --- ربط الأحداث ---
    closePopupButton.addEventListener('click', hidePopup);
    successOkButton.addEventListener('click', hidePopup);
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) hidePopup();
    });
    
    serviceSelect.addEventListener('change', updatePrice);
    quantityInput.addEventListener('input', updatePrice);
    linkInput.addEventListener('input', validateLink);
    orderForm.addEventListener('submit', handleFormSubmit);

    // --- البدء ---
    renderServiceCards();
});
