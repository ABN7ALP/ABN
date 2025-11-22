document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const ordersTbody = document.getElementById('my-orders-tbody');
    const loadingSpinner = document.getElementById('my-orders-loading');
    let userInfo = null;

    // دالة لجلب بيانات المستخدم من Local Storage
    function getUserInfo() {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            userInfo = JSON.parse(storedUser);
        } else {
            // إذا لم يكن المستخدم مسجلاً دخوله، أعد توجيهه للصفحة الرئيسية
            window.location.href = '/';
        }
    }

    // دالة لجلب طلبات المستخدم
    async function fetchMyOrders() {
        if (!userInfo) return;

        loadingSpinner.classList.remove('hidden');
        ordersTbody.innerHTML = '';

        try {
            const response = await fetch(`/api/orders/my-orders?userId=${userInfo._id}`);
            if (!response.ok) {
                throw new Error('فشل جلب الطلبات. حاول تحديث الصفحة.');
            }
            const orders = await response.json();
            renderMyOrders(orders);
        } catch (error) {
            ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">${error.message}</td></tr>`;
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    // دالة لعرض الطلبات في الجدول
    function renderMyOrders(orders) {
    ordersTbody.innerHTML = '';
    if (orders.length === 0) {
        ordersTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ليس لديك أي طلبات سابقة.</td></tr>';
        return;
    }
    orders.forEach(order => {
        const row = document.createElement('tr');
        const statusClass = `status-${order.status.replace(/\s/g, '-')}`;
        row.innerHTML = `
            <td data-label="الخدمة">${order.service} (${order.platform})</td>
            <td data-label="الكمية">${order.quantity.toLocaleString()}</td>
            <td data-label="السعر">${order.price.toFixed(2)} $</td>
            <td data-label="تاريخ الطلب">${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
            <td data-label="الحالة"><span class="status ${statusClass}">${order.status}</span></td>
        `;
        ordersTbody.appendChild(row);
    });
}


    // الاستماع للتحديثات الفورية
    socket.on('order-status-updated', (updatedOrder) => {
        // إذا كان الطلب المحدث يخص المستخدم الحالي، أعد تحميل الطلبات
        if (userInfo && updatedOrder.user === userInfo._id) {
            fetchMyOrders();
        }
    });

    // --- التشغيل ---
    getUserInfo();
    fetchMyOrders();
});
