document.addEventListener('DOMContentLoaded', () => {
    // --- عناصر الصفحة ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const adminContent = document.getElementById('admin-content');
    
    // عناصر الطلبات
    const ordersTbody = document.getElementById('orders-tbody');
    const loadingSpinner = document.getElementById('loading-spinner');
    const refreshBtn = document.getElementById('refresh-btn');

    // عناصر الخدمات
    const addServiceForm = document.getElementById('add-service-form');
    const serviceFormResponse = document.getElementById('service-form-response');
    const servicesTbody = document.getElementById('services-tbody');

    const ADMIN_PASSWORD = "password123"; // تذكر تغيير هذه الكلمة مستقبلاً

    // --- 1. معالجة تسجيل الدخول ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ADMIN_PASSWORD) {
            loginOverlay.classList.add('hidden');
            adminContent.classList.remove('hidden');
            // جلب كل البيانات عند تسجيل الدخول
            fetchOrders();
            fetchServices();
        } else {
            loginError.textContent = 'كلمة المرور غير صحيحة.';
            passwordInput.focus();
        }
    });

    // --- 2. إدارة الطلبات (Orders Management) ---
    
    async function fetchOrders() {
        loadingSpinner.classList.remove('hidden');
        ordersTbody.innerHTML = '';
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('فشل جلب الطلبات');
            const orders = await response.json();
            renderOrders(orders);
        } catch (error) {
            alert(error.message);
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    function renderOrders(orders) {
        if (orders.length === 0) {
            ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات حالياً.</td></tr>';
            return;
        }
        ordersTbody.innerHTML = '';
        orders.forEach(order => {
            const row = document.createElement('tr');
            const platformName = order.platform || 'غير محدد';
            const platformIcon = order.platform ? `ph-${order.platform.toLowerCase()}-logo` : 'ph-question';
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
            ordersTbody.appendChild(row);
        });
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', handleStatusChange);
        });
    }

    async function handleStatusChange(event) {
        const selectElement = event.target;
        const orderId = selectElement.dataset.orderId;
        const newStatus = selectElement.value;
        const row = selectElement.closest('tr');
        selectElement.disabled = true;
        row.style.opacity = '0.5';
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!response.ok) throw new Error('فشل تحديث حالة الطلب');
            row.style.backgroundColor = '#d4edda';
            setTimeout(() => { row.style.backgroundColor = ''; }, 1000);
        } catch (error) {
            alert(error.message);
            fetchOrders();
        } finally {
            selectElement.disabled = false;
            row.style.opacity = '1';
        }
    }

    // --- 3. إدارة الخدمات (Services Management) ---
    
    async function fetchServices() {
        try {
            const response = await fetch('/api/services');
            const services = await response.json();
            renderServices(services);
        } catch (error) {
            console.error('Failed to fetch services:', error);
        }
    }

    function renderServices(services) {
        servicesTbody.innerHTML = '';
        if (services.length === 0) {
            servicesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد خدمات مضافة حالياً.</td></tr>';
            return;
        }
        services.forEach(service => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${service.platform}</td>
                <td>${service.name}</td>
                <td>${service.pricePer1000.toFixed(2)} $</td>
                <td>${service.min.toLocaleString()} / ${service.max.toLocaleString()}</td>
                <td><button class="delete-service-btn" data-id="${service._id}"><i class="ph-bold ph-trash"></i></button></td>
            `;
            servicesTbody.appendChild(row);
        });
        document.querySelectorAll('.delete-service-btn').forEach(btn => {
            btn.addEventListener('click', handleDeleteService);
        });
    }

    addServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceData = {
            platform: document.getElementById('service-platform').value.trim(),
            name: document.getElementById('service-name').value.trim(),
            pricePer1000: parseFloat(document.getElementById('service-price').value),
            min: parseInt(document.getElementById('service-min').value),
            max: parseInt(document.getElementById('service-max').value),
        };
        try {
            const response = await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(serviceData),
            });
            const result = await response.json();
            serviceFormResponse.textContent = result.message;
            if (response.ok) {
                serviceFormResponse.style.color = 'green';
                addServiceForm.reset();
                fetchServices();
            } else {
                serviceFormResponse.style.color = 'red';
            }
        } catch (error) {
            serviceFormResponse.textContent = 'فشل الاتصال بالخادم.';
            serviceFormResponse.style.color = 'red';
        }
    });

    async function handleDeleteService(event) {
        const btn = event.currentTarget;
        const id = btn.dataset.id;
        if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
        try {
            const response = await fetch(`/api/services/${id}`, { method: 'DELETE' });
            if (response.ok) {
                fetchServices();
            } else {
                alert('فشل حذف الخدمة.');
            }
        } catch (error) {
            alert('فشل الاتصال بالخادم.');
        }
    }

    // --- ربط الأحداث ---
    refreshBtn.addEventListener('click', fetchOrders);
});
