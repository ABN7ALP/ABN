document.addEventListener('DOMContentLoaded', () => {
    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- 2. تعريف المتغيرات وعناصر الصفحة ---
    let userInfo = null;
    let services = [];
    let selectedService = null;
    const ADMIN_PHONE = '905367893256'; // تأكد من أن هذا هو الرقم الصحيح

    // عناصر الواجهة الرئيسية
    const mainNav = document.getElementById('main-nav');
    const servicesGrid = document.getElementById('services-grid');

    // عناصر النماذج والأخطاء
    const orderForm = document.getElementById('order-form');
    const linkInput = document.getElementById('service-link');
    const quantityInput = document.getElementById('service-quantity');
    const totalPriceEl = document.getElementById('total-price');
    const quantityErrorEl = document.getElementById('quantity-error');
    const quantityInfoEl = document.getElementById('quantity-info');
    const linkWarningEl = document.getElementById('link-warning');
    const orderFormResponse = document.getElementById('order-form-response');

    const loginForm = document.getElementById('login-form-popup');
    const registerForm = document.getElementById('register-form-popup');
    const depositForm = document.getElementById('deposit-form');
    const depositFormResponse = document.getElementById('deposit-form-response');
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    const paymentDetailsContainer = document.getElementById('payment-details-container');

    // تعريف الـ Modals الخاصة بـ Bootstrap
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    const depositModal = new bootstrap.Modal(document.getElementById('depositModal'));
    const orderModal = new bootstrap.Modal(document.getElementById('orderModal'));

    // --- 3. دوال الواجهة والتحديثات ---

    // تحديث واجهة المستخدم بناءً على حالة تسجيل الدخول
    function updateUIForAuth() {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            userInfo = JSON.parse(storedUser);
            mainNav.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdownMenu" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="ph-bold ph-user-circle me-2"></i> ${userInfo.username}
                    </button>
                    <ul class="dropdown-menu dropdown-menu-start" aria-labelledby="userDropdownMenu">
                        <li class="px-3 py-2">
                            <div class="fw-bold">رصيدك الحالي</div>
                            <div class="d-flex align-items-center gap-2 fs-5">
                                <i class="ph-bold ph-wallet text-primary"></i>
                                <span id="balance-display">${(userInfo.balance || 0).toFixed(2)} $</span>
                            </div>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="add-balance-link"><i class="ph-bold ph-plus-circle me-2"></i>شحن الرصيد</a></li>
                        <li><a class="dropdown-item" href="my-orders.html"><i class="ph-bold ph-list-checks me-2"></i>طلباتي</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="ph-bold ph-sign-out me-2"></i>تسجيل الخروج</a></li>
                    </ul>
                </div>
            `;
            mainNav.querySelector('#logout-btn').addEventListener('click', logout);
            mainNav.querySelector('#add-balance-link').addEventListener('click', (e) => {
                e.preventDefault();
                depositModal.show();
            });
        } else {
            userInfo = null;
            mainNav.innerHTML = `<button id="login-register-btn" class="btn btn-light">تسجيل الدخول / إنشاء حساب</button>`;
            mainNav.querySelector('#login-register-btn').addEventListener('click', () => authModal.show());
        }
    }

    // عرض الخدمات في الشبكة
    function renderServices() {
        if (!servicesGrid) return;
        servicesGrid.innerHTML = '';
        services.forEach(service => {
            const card = document.createElement('div');
            // استخدمنا كلاسات Bootstrap للشبكة
            card.className = 'col'; 
            card.innerHTML = `
                <div class="card h-100 text-center service-card shadow-sm">
                    <div class="card-body d-flex flex-column">
                        <div class="icon-wrapper mb-3">
                            <img src="/icons/${service.platform.toLowerCase().replace(/\s/g, '-')}.svg" alt="${service.platform}" onerror="this.src='/icons/default.svg'">
                        </div>
                        <h5 class="card-title fw-bold">${service.name}</h5>
                        <p class="card-text text-muted small flex-grow-1">${service.platform}</p>
                        <p class="card-text fw-bold fs-5 text-primary">${service.pricePer1000.toFixed(2)}$ / 1000</p>
                        <button class="btn btn-primary stretched-link mt-auto">اطلب الآن</button>
                    </div>
                </div>
            `;
            card.querySelector('button').addEventListener('click', () => openOrderModal(service));
            servicesGrid.appendChild(card);
        });
    }

    // فتح نافذة الطلب مع بيانات الخدمة المحددة
    function openOrderModal(service) {
        if (!userInfo) {
            authModal.show();
            return;
        }
        selectedService = service;
        document.getElementById('orderModalLabel').textContent = `طلب خدمة: ${service.name}`;
        quantityInfoEl.textContent = `الحد الأدنى: ${service.min}, الحد الأقصى: ${service.max}, الخطوة: ${service.step || 1}`;
        linkWarningEl.classList.remove('d-none');
        orderForm.reset();
        totalPriceEl.textContent = '$0.00';
        quantityErrorEl.textContent = '';
        orderFormResponse.textContent = '';
        orderModal.show();
    }

    // حساب السعر الإجمالي والتحقق من الكمية
    function calculatePrice() {
        if (!selectedService) return;
        const quantity = parseInt(quantityInput.value);
        const { pricePer1000, min, max, step } = selectedService;
        
        quantityErrorEl.textContent = '';
        if (isNaN(quantity) || quantity <= 0) {
            totalPriceEl.textContent = '$0.00';
            return;
        }

        if (quantity < min) quantityErrorEl.textContent = `الكمية أقل من الحد الأدنى (${min}).`;
        else if (quantity > max) quantityErrorEl.textContent = `الكمية أكبر من الحد الأقصى (${max}).`;
        else if (step && quantity % step !== 0) quantityErrorEl.textContent = `الكمية يجب أن تكون من مضاعفات ${step}.`;

        const price = (quantity / 1000) * pricePer1000;
        totalPriceEl.textContent = `$${price.toFixed(3)}`;
    }

    // --- 4. معالجة الأحداث (Event Handlers) ---

    // تسجيل الدخول
    loginForm.addEventListener('submit', async (e) => {
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
            if (!response.ok) throw new Error(data.message);
            localStorage.setItem('userInfo', JSON.stringify(data));
            authModal.hide();
            updateUIForAuth();
        } catch (error) {
            document.getElementById('login-popup-error').textContent = error.message;
        }
    });

    // إنشاء حساب
    registerForm.addEventListener('submit', async (e) => {
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
            if (!response.ok) throw new Error(data.message);
            localStorage.setItem('userInfo', JSON.stringify(data));
            authModal.hide();
            updateUIForAuth();
        } catch (error) {
            document.getElementById('register-popup-error').textContent = error.message;
        }
    });

    // تسجيل الخروج
    function logout(e) {
        e.preventDefault();
        localStorage.removeItem('userInfo');
        window.location.reload(); // إعادة تحميل الصفحة لضمان تجربة نظيفة
    }

    // التبديل بين نماذج الدخول وإنشاء الحساب
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form-container').classList.add('d-none');
        document.getElementById('register-form-container').classList.remove('d-none');
        document.getElementById('authModalLabel').textContent = 'إنشاء حساب جديد';
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-form-container').classList.add('d-none');
        document.getElementById('login-form-container').classList.remove('d-none');
        document.getElementById('authModalLabel').textContent = 'تسجيل الدخول';
    });

    // تحديث السعر عند تغيير الكمية
    quantityInput.addEventListener('input', calculatePrice);

    // تقديم طلب
    async function submitOrder(paymentMethod) {
        if (quantityErrorEl.textContent !== '') {
            orderFormResponse.textContent = 'يرجى تصحيح أخطاء الكمية أولاً.';
            orderFormResponse.className = 'form-message text-center fw-bold text-danger';
            return;
        }
        const orderData = {
            platform: selectedService.platform,
            service: selectedService.name,
            link: linkInput.value,
            quantity: parseInt(quantityInput.value),
            price: parseFloat(totalPriceEl.textContent.substring(1)),
            user: userInfo._id,
        };

        if (paymentMethod === 'balance') {
            try {
                const response = await fetch('/api/orders/pay-with-balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData),
                });
                const result = await response.json();
                orderFormResponse.textContent = result.message;
                orderFormResponse.className = `form-message text-center fw-bold ${response.ok ? 'text-success' : 'text-danger'}`;
                if (response.ok) {
                    setTimeout(() => orderModal.hide(), 2000);
                }
            } catch (error) {
                orderFormResponse.textContent = 'فشل الاتصال بالخادم.';
                orderFormResponse.className = 'form-message text-center fw-bold text-danger';
            }
        } else if (paymentMethod === 'whatsapp') {
            const message = `*طلب خدمة جديد*%0A---------------------------%0A*الخدمة:* ${orderData.service}%0A*المنصة:* ${orderData.platform}%0A*الرابط:* ${orderData.link}%0A*الكمية:* ${orderData.quantity}%0A*السعر:* ${orderData.price.toFixed(2)}$%0A---------------------------%0A*بيانات المستخدم:*%0A*اسم المستخدم:* ${userInfo.username}%0A*البريد الإلكتروني:* ${userInfo.email}`;
            window.open(`https://wa.me/${ADMIN_PHONE}?text=${message.trim()}`, '_blank');
        }
    }

    document.getElementById('pay-with-balance-btn').addEventListener('click', () => submitOrder('balance'));
    document.getElementById('pay-with-whatsapp-btn').addEventListener('click', () => submitOrder('whatsapp'));

    // معالجة إرسال طلب شحن الرصيد
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        depositFormResponse.textContent = 'جاري إرسال الطلب...';
        depositFormResponse.className = 'form-message text-center';
        const receiptFile = document.getElementById('deposit-receipt').files[0];
        const selectedMethod = document.querySelector('.payment-method-btn.active');
        if (!selectedMethod) {
            depositFormResponse.textContent = 'الرجاء اختيار طريقة الدفع.';
            depositFormResponse.className = 'form-message text-center fw-bold text-danger';
            return;
        }
        if (!receiptFile) {
            depositFormResponse.textContent = 'الرجاء رفع صورة الإيصال.';
            depositFormResponse.className = 'form-message text-center fw-bold text-danger';
            return;
        }
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
            if (!response.ok) throw new Error(result.message);
            depositFormResponse.textContent = result.message;
            depositFormResponse.className = 'form-message text-center fw-bold text-success';
            setTimeout(() => depositModal.hide(), 3000);
        } catch (error) {
            depositFormResponse.textContent = error.message;
            depositFormResponse.className = 'form-message text-center fw-bold text-danger';
        }
    });

    // اختيار طريقة الدفع
    paymentMethodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedBtn = e.currentTarget;
            paymentMethodBtns.forEach(b => b.classList.remove('active'));
            selectedBtn.classList.add('active');
            const method = selectedBtn.dataset.method;
            let detailsHTML = '';
            switch (method) {
                case 'bank': detailsHTML = `<p>يرجى تحويل المبلغ إلى الحساب التالي:</p><p>الاسم: <span>BESSAR</span></p><p>رقم الحساب (IBAN): <span>TR9785431312751367319</span></p>`; break;
                case 'sham': detailsHTML = `<p>يرجى مسح الباركود التالي والدفع عبر شام كاش:</p><img src="https://i.ibb.co/GvXw59R/bfa34fae23d4f3b4089e6d615bbd07d7.png" alt="Sham Cash QR Code" class="img-fluid">`; break;
                case 'whatsapp': detailsHTML = `<p>للحوالة عبر مكتب، يرجى التواصل معنا عبر واتساب للحصول على التفاصيل. بعد إتمام الحوالة، قم برفع صورة الإيصال هنا.</p>`; break;
            }
            paymentDetailsContainer.innerHTML = detailsHTML;
            paymentDetailsContainer.classList.remove('d-none');
        });
    });

    // --- 5. Socket.IO Listeners ---
    socket.on('connect', () => console.log('Connected to server via WebSocket.'));
    socket.on('user-balance-updated', (data) => {
        if (userInfo && userInfo._id === data.userId) {
            userInfo.balance = data.newBalance;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            const balanceEl = document.getElementById('balance-display');
            if (balanceEl) balanceEl.textContent = `${data.newBalance.toFixed(2)} $`;
        }
    });
    socket.on('service-updated', () => {
        // إعادة تحميل الخدمات عند حدوث تغيير
        initialize(true); // true to skip auth update
    });

    // --- 6. التحميل الأولي ---
    async function initialize(skipAuthUpdate = false) {
        if (!skipAuthUpdate) {
            updateUIForAuth();
        }
        try {
            const response = await fetch('/api/services');
            services = await response.json();
            renderServices();
        } catch (error) {
            console.error('Failed to fetch services:', error);
            if (servicesGrid) servicesGrid.innerHTML = `<p class="text-danger text-center">فشل تحميل الخدمات. يرجى تحديث الصفحة.</p>`;
        }
    }

    initialize();
});
