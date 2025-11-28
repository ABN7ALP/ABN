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
    const profileImageHTML = userInfo.profileImage 
        ? `<img src="${userInfo.profileImage}" alt="${userInfo.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--purple-main);">`
        : `<i class="ph-bold ph-user-circle" style="font-size: 1.5rem; color: var(--purple-main);"></i>`;

    mainNav.innerHTML = `
        <div class="user-dropdown">
            <div class="user-dropdown-toggle">
                ${profileImageHTML}
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

    // دالة لجلب وعرض طلبات الخدمات
    // دالة لجلب وعرض طلبات الخدمات
async function fetchMyOrders() {
    showLoading(myOrdersTbody, 5);
    try {
        const response = await fetch(`/api/orders/my-orders?userId=${userInfo._id}`);
        if (!response.ok) throw new Error('فشل جلب طلبات الخدمات');
        const orders = await response.json();
        renderMyOrders(orders);
    } catch (error) {
        myOrdersTbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:var(--danger-red); padding: 2rem;">
                    <i class="ph-bold ph-warning-circle"></i>
                    ${error.message}
                </td>
            </tr>
        `;
    } finally {
        // 🆕 إخفاء دائرة التحميل بغض النظر عن النتيجة
        const loadingElement = document.getElementById('my-orders-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
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
        depositsTbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color:var(--danger-red); padding: 2rem;">
                    <i class="ph-bold ph-warning-circle"></i>
                    ${error.message}
                </td>
            </tr>
        `;
    }
}

// 🆕 تحديث دالة renderMyDeposits لاستخدام التنسيقات الجديدة
function renderMyDeposits(deposits) {
    depositsTbody.innerHTML = '';
    if (deposits.length === 0) {
        depositsTbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding: 3rem; color: var(--text-light);">
                    <i class="ph-bold ph-wallet" style="font-size: 3rem; opacity: 0.5; display: block; margin-bottom: 1rem;"></i>
                    لا توجد معاملات شحن سابقة.
                </td>
            </tr>
        `;
        return;
    }
    
    deposits.forEach(deposit => {
        const row = document.createElement('tr');
        const statusText = { 
            pending: 'قيد المراجعة', 
            approved: 'مقبول', 
            rejected: 'مرفوض' 
        }[deposit.status] || deposit.status;
        
        const statusClass = `status status-${deposit.status}`;
        
        row.innerHTML = `
            <td data-label="المبلغ" style="font-weight: 700; color: var(--purple-main);">
                ${deposit.amount.toFixed(2)} $
            </td>
            <td data-label="الطريقة">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="ph-bold ph-${getMethodIcon(deposit.method)}" style="color: var(--purple-main);"></i>
                    <span>${getMethodText(deposit.method)}</span>
                </div>
            </td>
            <td data-label="تاريخ الطلب" style="color: var(--text-light); font-size: 0.85rem;">
                ${new Date(deposit.createdAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </td>
            <td data-label="الحالة">
                <span class="${statusClass}">${statusText}</span>
            </td>
        `;
        depositsTbody.appendChild(row);
    });
}

// 🆕 دوال مساعدة لطرق الدفع
function getMethodIcon(method) {
    const icons = {
        bank: 'bank',
        sham: 'qr-code',
        whatsapp: 'storefront'
    };
    return icons[method] || 'credit-card';
}

function getMethodText(method) {
    const texts = {
        bank: 'تحويل بنكي',
        sham: 'شام كاش',
        whatsapp: 'حوالة مكتب'
    };
    return texts[method] || method;
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
