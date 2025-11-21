document.addEventListener('DOMContentLoaded', () => {
  // --- بيانات الخدمات (يمكنك تعديلها أو جلبها من قاعدة البيانات لاحقاً) ---
  const servicesData = {
    Instagram: {
      // يمكنك استضافة الأيقونات بنفسك أو استخدام روابط مباشرة
      icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
      // تعبير نمطي للتحقق من صحة الرابط
      validation: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/,
      // الخدمات المتاحة لهذه المنصة
      services: [
        { name: 'متابعين', pricePer1000: 10.50 },
        { name: 'لايكات', pricePer1000: 5.00 },
        { name: 'مشاهدات فيديو', pricePer1000: 2.50 },
      ],
    },
    TikTok: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
      validation: /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/,
      services: [
        { name: 'متابعين', pricePer1000: 12.00 },
        { name: 'مشاهدات', pricePer1000: 1.50 },
        { name: 'لايكات', pricePer1000: 8.00 },
      ],
    },
    Twitter: {
        icon: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
        validation: /^(https?:\/\/)?(www\.)?twitter\.com\/.+/,
        services: [
            { name: 'متابعين', pricePer1000: 15.00 },
            { name: 'إعادة تغريد', pricePer1000: 20.00 },
        ],
    },
    // أضف المزيد من المنصات هنا بنفس الطريقة
  };

  // --- جلب عناصر الصفحة من HTML ---
  const servicesContainer = document.getElementById('services-container');
  const orderFormContainer = document.getElementById('order-form-container');
  const formTitle = document.getElementById('form-title');
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

  // --- 1. عرض بطاقات الخدمات عند تحميل الصفحة ---
  function renderServiceCards() {
    servicesContainer.innerHTML = ''; // إفراغ الحاوية أولاً
    for (const platform in servicesData) {
      const card = document.createElement('div');
      card.className = 'service-card';
      card.dataset.platform = platform;
      card.innerHTML = `
        <img src="${servicesData[platform].icon}" alt="${platform} icon">
        <h3>${platform}</h3>
      `;
      card.addEventListener('click', () => showOrderForm(platform));
      servicesContainer.appendChild(card);
    }
  }

  // --- 2. إظهار نموذج الطلب عند الضغط على بطاقة ---
  function showOrderForm(platform) {
    currentPlatform = platform;
    formTitle.textContent = `طلب خدمة لـ ${platform}`;
    
    // ملء قائمة الخدمات المنسدلة
    serviceSelect.innerHTML = '';
    servicesData[platform].services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.name;
      option.dataset.price = service.pricePer1000;
      option.textContent = `${service.name}`;
      serviceSelect.appendChild(option);
    });

    // إعادة تعيين النموذج وإظهاره
    orderForm.reset();
    formResponse.textContent = '';
    linkError.textContent = '';
    orderFormContainer.classList.remove('hidden');
    updatePrice(); // تحديث السعر عند أول ظهور
  }

  // --- 3. تحديث السعر تلقائياً عند تغيير الخدمة أو الكمية ---
  function updatePrice() {
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    if (!selectedOption) return;

    currentServicePrice = parseFloat(selectedOption.dataset.price);
    const quantity = parseInt(quantityInput.value, 10);
    
    if (isNaN(quantity) || quantity <= 0) {
        priceDisplay.textContent = '0.00';
        return;
    }

    const totalPrice = (quantity / 1000) * currentServicePrice;
    priceDisplay.textContent = totalPrice.toFixed(2);
  }

  // --- 4. التحقق من صحة الرابط أثناء الكتابة ---
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

  // --- 5. معالجة إرسال الطلب إلى الخادم ---
  async function handleFormSubmit(event) {
    event.preventDefault(); // منع التحديث التلقائي للصفحة
    
    if (!validateLink()) {
        alert('الرجاء إدخال رابط صحيح.');
        return;
    }

    // تجهيز البيانات لإرسالها
    const orderData = {
      platform: currentPlatform,
      service: serviceSelect.value,
      link: linkInput.value,
      quantity: parseInt(quantityInput.value, 10),
      price: parseFloat(priceDisplay.textContent),
    };

    // تعطيل زر الإرسال وإظهار رسالة "جارٍ الإرسال"
    submitButton.disabled = true;
    submitButton.textContent = 'جاري إرسال الطلب...';
    formResponse.textContent = '';

    try {
      // إرسال الطلب إلى الـ API الذي أنشأناه
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (response.ok) {
        formResponse.style.color = 'green';
        formResponse.textContent = result.message; // عرض رسالة النجاح من الخادم
        orderForm.reset(); // إفراغ النموذج بعد النجاح
        setTimeout(() => { // إخفاء النموذج بعد فترة
            orderFormContainer.classList.add('hidden');
            formResponse.textContent = '';
        }, 3000);
      } else {
        // في حال حدوث خطأ من الخادم
        formResponse.style.color = 'red';
        formResponse.textContent = result.message || 'حدث خطأ ما، يرجى المحاولة مرة أخرى.';
      }
    } catch (error) {
      // في حال فشل الاتصال بالخادم
      formResponse.style.color = 'red';
      formResponse.textContent = 'فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
    } finally {
      // إعادة تفعيل زر الإرسال في كل الحالات
      submitButton.disabled = false;
      submitButton.textContent = 'تأكيد الطلب';
      updatePrice();
    }
  }

  // --- ربط الأحداث بالدوال ---
  serviceSelect.addEventListener('change', updatePrice);
  quantityInput.addEventListener('input', updatePrice);
  linkInput.addEventListener('input', validateLink);
  orderForm.addEventListener('submit', handleFormSubmit);

  // --- البدء بتشغيل كل شيء ---
  renderServiceCards();
});
