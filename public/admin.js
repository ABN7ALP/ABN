document.addEventListener('DOMContentLoaded', () => {
    // --- عناصر الصفحة ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const adminContent = document.getElementById('admin-content');
    const ordersTbody = document.getElementById('orders-tbody');
    const loadingSpinner = document.getElementById('loading-spinner');
    const refreshBtn = document.getElementById('refresh-btn');

    // كلمة مرور بسيطة (يجب تغييرها لشيء أكثر أماناً في المستقبل)
    const ADMIN_PASSWORD = "password123";

    // --- 1. معالجة تسجيل الدخول ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ADMIN_PASSWORD) {
            loginOverlay.classList.add('hidden');
            adminContent.classList.remove('hidden');
            fetchOrders();
        } else {
            loginError.textContent = 'كلمة المرور غير صحيحة.';
        }
    });

    // --- 2. جلب الطلبات من الخادم ---
    async function fetchOrders() {
        loadingSpinner.classList.remove('hidden');
        ordersTbody.innerHTML = ''; // إفراغ الجدول قبل التحديث
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('فشل جلب البيانات');
            
            const orders = await response.json();
            renderOrders(orders);
        } catch (error) {
            alert(error.message);
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    // --- 3. عرض الطلبات في الجدول ---
    // --- 3. عرض الطلبات في الجدول ---
function renderOrders(orders) {
    if (orders.length === 0) {
        ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات حالياً.</td></tr>';
        return;
    }

    ordersTbody.innerHTML = ''; // إفراغ الجدول قبل إضافة الصفوف الجديدة

    orders.forEach(order => {
        const row = document.createElement('tr');

        // --- هذا هو الجزء الذي تم تعديله ---
        // التحقق من وجود المنصة قبل استخدامها لتجنب الخطأ
        const platformName = order.platform || 'غير محدد'; // إذا لم تكن المنصة موجودة، اعرض "غير محدد"
        const platformIcon = order.platform ? `ph-${order.platform.toLowerCase()}-logo` : 'ph-question'; // استخدم أيقونة استفهام كخيار احتياطي

        row.innerHTML = `
            <td><i class="ph-bold ${platformIcon}"></i> ${platformName}</td>
            <td>${order.service || 'N/A'}</td>
            <td><a href="${order.link || '#'}" target="_blank">عرض الرابط</a></td>
            <td>${order.quantity ? order.quantity.toLocaleString() : 'N/A'}</td>
            <td>${order.price ? order.price.toFixed(2) : '0.00'} $</td>
            <td>${order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : 'N/A'}</td>
            <td>
                <div class="select-wrapper status-select-wrapper">
                    <select class="status-select" data-order-id="${order._id}">
                        <option value="قيد المراجعة" ${order.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option>
                        <option value="قيد التنفيذ" ${order.status === 'قيد التنفيذ' ? 'selected' : ''}>قيد التنفيذ</option>
                        <option value="مكتمل" ${order.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option>
                        <option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option>
                    </select>
                </div>
            </td>
        `;
        // --- نهاية الجزء المعدل ---

        ordersTbody.appendChild(row);
    });

    // إعادة ربط الأحداث بعد إعادة رسم الجدول
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', handleStatusChange);
    });
}


    // --- 4. معالجة تغيير حالة الطلب ---
    // --- 4. معالجة تغيير حالة الطلب ---
async function handleStatusChange(event) {
    const selectElement = event.target;
    const orderId = selectElement.dataset.orderId;
    const newStatus = selectElement.value;
    const row = selectElement.closest('tr'); // الحصول على صف الجدول الأب

    selectElement.disabled = true;
    row.style.opacity = '0.5'; // جعل الصف باهتاً أثناء التحديث

    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            throw new Error('فشل تحديث حالة الطلب');
        }
        
        // تأكيد مرئي للنجاح
        row.style.backgroundColor = '#d4edda'; // لون أخضر فاتح
        setTimeout(() => {
            row.style.backgroundColor = ''; // إزالة اللون بعد ثانية
        }, 1000);

    } catch (error) {
        alert(error.message);
        // في حال الفشل، أعد تحميل جميع الطلبات لضمان مزامنة البيانات
        fetchOrders(); 
    } finally {
        selectElement.disabled = false;
        row.style.opacity = '1';
    }
}


    // --- ربط الأحداث ---
    refreshBtn.addEventListener('click', fetchOrders);
});
