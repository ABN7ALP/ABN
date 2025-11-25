document.addEventListener('DOMContentLoaded', () => {
    // --- 1. تعريف العناصر والمتغيرات ---
    const mainContent = document.getElementById('main-content');
    const mainNav = document.getElementById('main-nav');
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = localStorage.getItem('token');

    // --- 2. دالة لإنشاء واجهة المستخدم ---
    function buildUI() {
        // بناء الهيكل الأساسي للصفحة
        mainContent.innerHTML = `
            <section class="hero-section">
                <h1>سجلاتي</h1>
                <p>هنا يمكنك متابعة حالة جميع معاملاتك وطلباتك السابقة والحالية.</p>
            </section>

            <section class="data-section" id="deposits-section">
                <h2 class="section-title"><i class="ph-bold ph-money"></i> سجل معاملات الشحن</h2>
                <div id="deposits-container"></div>
            </section>

            <section class="data-section" id="orders-section">
                <h2 class="section-title"><i class="ph-bold ph-list-checks"></i> سجل طلبات الخدمات</h2>
                <div id="orders-container"></div>
            </section>
        `;
    }

    // --- 3. دوال عرض الحالات (تحميل، خطأ، فارغ) ---
    function renderLoadingState(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="state-container">
                <div class="loading-spinner"><i class="ph-bold ph-circle-notch animate-spin"></i></div>
                <p>جاري تحميل البيانات...</p>
            </div>
        `;
    }

    function renderErrorState(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="state-container">
                <p class="error-message">${message}</p>
            </div>
        `;
    }

    function renderEmptyState(containerId, message) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="state-container">
                <p>${message}</p>
            </div>
        `;
    }

    // --- 4. دوال جلب وعرض البيانات ---
    async function fetchAndRenderData(url, containerId, renderFunction, emptyMessage) {
        renderLoadingState(containerId);
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                throw new Error(`فشل جلب البيانات (خطأ ${response.status})`);
            }
            const data = await response.json();
            if (data.length === 0) {
                renderEmptyState(containerId, emptyMessage);
            } else {
                renderFunction(containerId, data);
            }
        } catch (error) {
            renderErrorState(containerId, error.message);
        }
    }

    function renderDeposits(containerId, deposits) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="cards-container">
                <div class="table-header">
                    <div class="data-card">
                        <div class="card-row">المبلغ</div>
                        <div class="card-row">الطريقة</div>
                        <div class="card-row">التاريخ</div>
                        <div class="card-row">الحالة</div>
                    </div>
                </div>
                ${deposits.map(deposit => {
                    const statusText = { pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' }[deposit.status] || deposit.status;
                    return `
                        <div class="data-card">
                            <div class="card-row"><span class="card-label">المبلغ:</span> <span class="card-value">${deposit.amount.toFixed(2)} $</span></div>
                            <div class="card-row"><span class="card-label">الطريقة:</span> <span class="card-value">${deposit.method}</span></div>
                            <div class="card-row"><span class="card-label">التاريخ:</span> <span class="card-value">${new Date(deposit.createdAt).toLocaleDateString('ar-EG')}</span></div>
                            <div class="card-row"><span class="card-label">الحالة:</span> <span class="card-value"><span class="status-badge status-${deposit.status}">${statusText}</span></span></div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderOrders(containerId, orders) {
        const container = document.getElementById(containerId);
        container.innerHTML = `
            <div class="cards-container">
                <div class="table-header">
                     <div class="data-card">
                        <div class="card-row">المنصة</div>
                        <div class="card-row">الخدمة</div>
                        <div class="card-row">الكمية</div>
                        <div class="card-row">السعر</div>
                        <div class="card-row">التاريخ</div>
                        <div class="card-row">الحالة</div>
                    </div>
                </div>
                ${orders.map(order => `
                    <div class="data-card">
                        <div class="card-row"><span class="card-label">المنصة:</span> <span class="card-value">${order.platform || 'N/A'}</span></div>
                        <div class="card-row"><span class="card-label">الخدمة:</span> <span class="card-value">${order.service || 'N/A'}</span></div>
                        <div class="card-row"><span class="card-label">الكمية:</span> <span class="card-value">${order.quantity ? order.quantity.toLocaleString() : 'N/A'}</span></div>
                        <div class="card-row"><span class="card-label">السعر:</span> <span class="card-value">${order.price ? order.price.toFixed(2) : '0.00'} $</span></div>
                        <div class="card-row"><span class="card-label">التاريخ:</span> <span class="card-value">${new Date(order.createdAt).toLocaleDateString('ar-EG')}</span></div>
                        <div class="card-row"><span class="card-label">الحالة:</span> <span class="card-value"><span class="status-badge status-${order.status.replace(/\s/g, '-')}">${order.status}</span></span></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // --- 5. دوال المصادقة وتحديث الهيدر ---
    function renderLoginPrompt() {
        mainContent.innerHTML = `
            <div class="state-container" style="margin-top: 2rem;">
                <h2>يرجى تسجيل الدخول</h2>
                <p>يجب عليك تسجيل الدخول أولاً لرؤية سجلاتك.</p>
                <a href="index.html" class="pill-button primary-button" style="margin-top: 1rem; display: inline-block; width: auto;">العودة لتسجيل الدخول</a>
            </div>
        `;
        mainNav.innerHTML = ''; // إفراغ قائمة التنقل
    }

    function updateHeaderUI() {
        // هذا الكود مطابق للكود في app.js لتوحيد الشكل
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
                    <a href="index.html#deposit"><i class="ph-bold ph-plus-circle"></i> شحن الرصيد</a>
                    <a href="my-orders.html"><i class="ph-bold ph-list-checks"></i> طلباتي</a>
                    <button id="logout-btn" class="logout-link"><i class="ph-bold ph-sign-out"></i> تسجيل الخروج</button>
                </div>
            </div>
        `;
        
        const dropdown = mainNav.querySelector('.user-dropdown');
        const toggle = mainNav.querySelector('.user-dropdown-toggle');

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('userInfo');
            localStorage.removeItem('token');
            window.location.href = '/';
        });

        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // --- 6. نقطة البداية الرئيسية ---
    function initialize() {
        if (!userInfo || !token) {
            renderLoginPrompt();
            return;
        }
        
        updateHeaderUI();
        buildUI();
        
        // جلب البيانات
        fetchAndRenderData(`/api/deposits/my-deposits?userId=${userInfo._id}`, 'deposits-container', renderDeposits, 'لا توجد معاملات شحن سابقة.');
        fetchAndRenderData(`/api/orders/my-orders?userId=${userInfo._id}`, 'orders-container', renderOrders, 'لم تقم بأي طلبات خدمات بعد.');
    }

    initialize();
});
