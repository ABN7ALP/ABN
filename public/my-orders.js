document.addEventListener('DOMContentLoaded', () => {
    // --- 1. تعريف العناصر والمتغيرات ---
    const myOrdersTbody = document.getElementById('my-orders-tbody');
    const depositsTbody = document.getElementById('deposits-tbody');
    const mainContent = document.querySelector('main.container');
    const mainNav = document.getElementById('main-nav');
    const heroSection = document.querySelector('.hero');

    // جلب معلومات المستخدم من التخزين المحلي
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));

    // --- 2. التحقق من تسجيل الدخول ---
    if (!userInfo || !userInfo._id) {
        // إخفاء المحتوى الرئيسي وعرض رسالة لتسجيل الدخول
        heroSection.style.display = 'none';
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 4rem 1rem; background: white; border-radius: 20px; margin-top: 2rem;">
                <h2>يرجى تسجيل الدخول</h2>
                <p>يجب عليك تسجيل الدخول أولاً لتتمكن من رؤية سجلاتك.</p>
                <a href="index.html" class="pill-button primary-button" style="margin-top: 1rem; display: inline-block; width: auto;">العودة إلى الصفحة الرئيسية</a>
            </div>
        `;
        // تحديث الهيدر لعرض أزرار تسجيل الدخول
        mainNav.innerHTML = `
            <a href="index.html#login" class="pill-button secondary-button">تسجيل الدخول</a>
            <a href="index.html#register" class="pill-button primary-button">إنشاء حساب</a>
        `;
        return; // إيقاف تنفيذ بقية الكود
    }

    // --- 3. تحديث واجهة المستخدم للمستخدم المسجل دخوله ---
    function updateHeaderUI() {
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
        // ربط أحداث القائمة المنسدلة
        const dropdown = mainNav.querySelector('.user-dropdown');
        dropdown.addEventListener('click', (e) => {
            if (e.target.closest('.user-dropdown-toggle')) {
                dropdown.classList.toggle('active');
            }
        });
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('userInfo');
            window.location.href = '/';
        });
        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    // --- 4. دوال جلب وعرض البيانات ---

    // دالة لعرض رسالة التحميل في أي جدول
    function showLoading(tbody, colspan) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center; padding: 2rem;"><div class="loading-spinner" style="display:block;"><i class="ph-bold ph-circle-notch animate-spin"></i></div></td></tr>`;
    }

    // دالة لجلب وعرض طلبات الخدمات
    async function fetchMyOrders() {
        showLoading(myOrdersTbody, 6);
        try {
            const response = await fetch(`/api/orders/my-orders?userId=${userInfo._id}`);
            if (!response.ok) throw new Error('فشل جلب طلبات الخدمات');
            const orders = await response.json();
            renderMyOrders(orders);
        } catch (error) {
            myOrdersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    }

    function renderMyOrders(orders) {
        myOrdersTbody.innerHTML = '';
        if (orders.length === 0) {
            myOrdersTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لم تقم بأي طلبات خدمات بعد.</td></tr>';
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="المنصة">${order.platform || 'N/A'}</td>
                <td data-label="الخدمة">${order.service || 'N/A'}</td>
                <td data-label="الكمية">${order.quantity ? order.quantity.toLocaleString() : 'N/A'}</td>
                <td data-label="السعر">${order.price ? order.price.toFixed(2) : '0.00'} $</td>
                <td data-label="تاريخ الطلب">${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                <td data-label="الحالة"><span class="status status-${order.status.replace(/\s/g, '-')}">${order.status}</span></td>
            `;
            myOrdersTbody.appendChild(row);
        });
    }

    // دالة لجلب وعرض معاملات الشحن
    async function fetchMyDeposits() {
        showLoading(depositsTbody, 4);
        try {
            const response = await fetch(`/api/deposits/my-deposits?userId=${userInfo._id}`);
            if (!response.ok) throw new Error('فشل جلب معاملات الشحن');
            const deposits = await response.json();
            renderMyDeposits(deposits);
        } catch (error) {
            depositsTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    }

    function renderMyDeposits(deposits) {
        depositsTbody.innerHTML = '';
        if (deposits.length === 0) {
            depositsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">لا توجد معاملات شحن سابقة.</td></tr>';
            return;
        }
        deposits.forEach(deposit => {
            const row = document.createElement('tr');
            const statusText = { pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' }[deposit.status] || deposit.status;
            row.innerHTML = `
                <td data-label="المبلغ">${deposit.amount.toFixed(2)} $</td>
                <td data-label="الطريقة">${deposit.method}</td>
                <td data-label="تاريخ الطلب">${new Date(deposit.createdAt).toLocaleDateString('ar-EG')}</td>
                <td data-label="الحالة"><span class="status status-${deposit.status}">${statusText}</span></td>
            `;
            depositsTbody.appendChild(row);
        });
    }

    // --- 5. الاستماع للتحديثات الفورية (Socket.IO) ---
    const socket = io();
    socket.on('order-status-updated', (updatedOrder) => {
        if (userInfo && updatedOrder.user === userInfo._id) {
            fetchMyOrders(); // تحديث جدول الطلبات فقط
        }
    });
    socket.on('deposit-approved', (data) => {
        if (userInfo && data.userId === userInfo._id) {
            fetchMyDeposits(); // تحديث جدول الشحن
            // يمكنك أيضاً تحديث الرصيد في الهيدر هنا إذا أردت
        }
    });

    // --- 6. بدء تشغيل كل شيء ---
    updateHeaderUI();
    fetchMyOrders();
    fetchMyDeposits();
});
