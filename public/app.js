document.addEventListener('DOMContentLoaded', () => {
  // --- بيانات الخدمات (يمكنك تعديلها أو جلبها من قاعدة البيانات لاحقاً) ---
  const servicesData = {
    Instagram: {
      icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png',
      validation: /^(https?:\/\/)?(www\.)?instagram\.com\/.+/,
      services: [
        { name: 'متابعين', pricePer1000: 10 },
        { name: 'لايكات', pricePer1000: 5 },
      ],
    },
    TikTok: {
      icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg',
      validation: /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/,
      services: [
        { name: 'متابعين', pricePer1000: 12 },
        { name: 'مشاهدات', pricePer1000: 2 },
      ],
    },
    // أضف المزيد من المنصات هنا بنفس الطريقة
  };

  // --- عناصر الصفحة ---
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

  let currentPlatform = null;
  let currentServicePrice = 0;

  // --- عرض بطاقات الخدمات ---
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

  // --- إظهار نموذج الطلب ---
  function showOrderForm(platform) {
    currentPlatform = platform;
    formTitle.textContent = `طلب خدمة لـ ${platform}`;
        
    // ملء قائمة الخدمات
    serviceSelect.innerHTML = '';
    servicesData[platform].services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.name;
      option.dataset.price = service.pricePer1000;
      option.textContent = `${service.name} (السعر: ${service.pricePer1000}$ لكل 1000)`;
      serviceSelect.appendChild(option);
    });

    orderFormContainer.classList.remove('hidden');
    updatePrice(); // تحديث السعر عند أول ظهور
  }

  // --- تحديث السعر ---
  function updatePrice() {
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    if (!selectedOption) return;

    currentServicePrice = parseFloat(selectedOption.dataset.price);
    const quantity = parseInt(quantityInput.value, 10);
    const totalPrice = (quantity / 1000) * currentServicePrice;
    priceDisplay.textContent = totalPrice.toFixed(2);
  }

  // --- التحقق من الرابط ---
  function validateLink() {
    const link = linkInput.value;
    const platformData = servicesData[currentPlatform];
    if (platformData && !platformData.validation.test(link)) {
      linkError.textContent = `الرابط غير صحيح. يجب أن يكون رابط ${currentPlatform}.`;
      return false;
    } else {
      linkError.textContent = '';
      return true;
    }
  }

  // --- معالجة إرسال الطلب ---
  async function handleFormSubmit(event) {
    event.preventDefault();
    formResponse.textContent = '';

    if (!validateLink()) return;

    const orderData = {
      platform: currentPlatform,
      service: serviceSelect.value,
      link: linkInput.value,
      quantity: parseInt(quantityInput.value, 10),
      price: parseFloat(priceDisplay.textContent),
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (response.ok) {
        formResponse.style.color = 'green';
        formResponse.textContent = result.message;
        orderForm.reset(); // إفراغ النموذج
        updatePrice();
      } else {
        formResponse.style.color = 'red';
        formResponse.textContent = result.message || 'حدث خطأ ما.';
      }
    } catch (error) {
      formResponse.style.color = 'red';
      formResponse.textContent = 'فشل الاتصال بالخادم. حاول مرة أخرى.';
    }
  }

  // --- ربط الأحداث ---
  serviceSelect.addEventListener('change', updatePrice);
  quantityInput.addEventListener('input', updatePrice);
  linkInput.addEventListener('input', validateLink);
  orderForm.addEventListener('submit', handleFormSubmit);
});
