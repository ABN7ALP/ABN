// هذه الدالة يجب أن تكون خارج `DOMContentLoaded` لتكون متاحة بشكل عام
function viewReceipt(base64Image) {
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(`
            <html>
                <head>
                    <title>عرض الإيصال</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; background-color: #2a2a2a; }
                        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <img src="${base64Image}" alt="إيصال الدفع">
                </body>
            </html>
        `);
        newWindow.document.close();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- 2. عناصر الصفحة العامة ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');
    const adminDashboard = document.getElementById('admin-dashboard');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const sections = document.querySelectorAll('.admin-section');
    
    // عناصر الإحصائيات
    const statsContainer = document.getElementById('stats-cards-container');

    // عناصر الجداول
    const ordersTbody = document.getElementById('orders-tbody');
    const servicesTbody = document.getElementById('services-tbody');
    const depositsTbody = document.getElementById('deposits-tbody');

    // عناصر نموذج إضافة/تعديل خدمة
    const addServiceForm = document.getElementById('add-service-form');
    const serviceFormResponse = document.getElementById('service-form-response');
    const editServicePopup = document.getElementById('edit-service-popup');
    const editServiceForm = document.getElementById('edit-service-form');
    const closeEditPopupBtn = document.getElementById('close-edit-popup-btn');

    // كلمة مرور لوحة التحكم
    const ADMIN_PASSWORD = "password123"; // يمكنك تغييرها من هنا

    // --- 3. نظام الدخول والتنقل ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === ADMIN_PASSWORD) {
            loginOverlay.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            loadInitialData(); // تحميل البيانات بعد تسجيل الدخول الناجح
            setupSocketListeners();
        } else {
            loginError.textContent = 'كلمة المرور غير صحيحة.';
            passwordInput.focus();
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (!link.classList.contains('logout-link')) {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                sections.forEach(section => {
                    section.classList.toggle('active', section.id === `${targetId}-section`);
                });
            }
        });
    });

    // --- 4. دوال جلب وعرض البيانات ---
    async function fetchData(url, renderer, container) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`فشل جلب البيانات`);
            const data = await response.json();
            renderer(data);
        } catch (error) {
            console.error(error);
            if (container) {
                container.innerHTML = `<p style="color:red; text-align:center; padding: 2rem;">${error.message}</p>`;
            }
        }
    }

    function renderStats(stats) {
        statsContainer.innerHTML = `
            <div class="stat-card"><div class="stat-icon" style="background-color: #e6f2ff;"><i class="ph-bold ph-wallet" style="color: #007bff;"></i></div><div class="stat-info"><p>إجمالي الدخل</p><h3>${(stats.totalRevenue || 0).toFixed(2)} $</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background-color: #e4f8f0;"><i class="ph-bold ph-check-circle" style="color: #28a745;"></i></div><div class="stat-info"><p>الطلبات المكتملة</p><h3>${stats.completedOrders || 0}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background-color: #fff8e1;"><i class="ph-bold ph-timer" style="color: #ffc107;"></i></div><div class="stat-info"><p>الطلبات قيد المعالجة</p><h3>${stats.pendingOrders || 0}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background-color: #f3e8ff;"><i class="ph-bold ph-users" style="color: #6f42c1;"></i></div><div class="stat-info"><p>إجمالي المستخدمين</p><h3>${stats.totalUsers || 0}</h3></div></div>
        `;
    }

    function renderOrders(orders) {
        if (!ordersTbody) return;
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات حالياً.</td></tr>';
            return;
        }
        orders.forEach(order => {
            const row = document.createElement('tr');
            const platformName = order.platform || 'غير محدد';
            const platformIcon = order.platform ? `ph-${order.platform.toLowerCase().replace(/\s/g, '')}-logo` : 'ph-question';
            row.innerHTML = `
                <td data-label="المنصة"><i class="ph-bold ${platformIcon}"></i> ${platformName}</td>
                <td data-label="الخدمة">${order.service || 'N/A'}</td>
                <td data-label="الرابط"><a href="${order.link || '#'}" target="_blank">عرض الرابط</a></td>
                <td data-label="الكمية">${order.quantity ? order.quantity.toLocaleString() : 'N/A'}</td>
                <td data-label="السعر">${order.price ? order.price.toFixed(2) : '0.00'} $</td>
                <td data-label="تاريخ الطلب">${order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : 'N/A'}</td>
                <td data-label="الحالة">
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
        document.querySelectorAll('.status-select').forEach(select => select.addEventListener('change', handleStatusChange));
    }

    function renderServices(services) {
        if (!servicesTbody) return;
        servicesTbody.innerHTML = '';
        if (services.length === 0) {
            servicesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد خدمات مضافة.</td></tr>';
            return;
        }
        services.forEach(service => {
            const row = document.createElement('tr');
            row.dataset.service = JSON.stringify(service);
            row.innerHTML = `
                <td data-label="المنصة">${service.platform}</td>
                <td data-label="الخدمة">${service.name}</td>
                <td data-label="السعر/1000">${service.pricePer1000.toFixed(2)} $</td>
                <td data-label="أدنى/أقصى حد">${service.min.toLocaleString()} / ${service.max.toLocaleString()}</td>
                <td data-label="إجراءات" class="action-buttons">
                    <button class="pill-button-icon edit-btn" data-tooltip="تعديل"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button class="pill-button-icon delete-btn" data-tooltip="حذف"><i class="ph-bold ph-trash"></i></button>
                </td>
            `;
            servicesTbody.appendChild(row);
        });
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteService));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleOpenEditPopup));
    }

    function renderDeposits(deposits) {
        if (!depositsTbody) return;
        depositsTbody.innerHTML = '';
        if (deposits.length === 0) {
            depositsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات شحن حالياً.</td></tr>';
            return;
        }
        deposits.forEach(deposit => {
            const row = document.createElement('tr');
            row.dataset.depositId = deposit._id;
            const statusClass = `status-${deposit.status}`;
            const statusText = { pending: 'قيد المراجعة', approved: 'مقبول', rejected: 'مرفوض' }[deposit.status];
            row.innerHTML = `
                <td data-label="المستخدم">${deposit.user ? deposit.user.username : 'مستخدم محذوف'}</td>
                <td data-label="المبلغ">${deposit.amount.toFixed(2)} $</td>
                <td data-label="الطريقة">${deposit.method}</td>
                <td data-label="اسم المودع">${deposit.depositorName}</td>
                <td data-label="الإيصال"><button onclick="viewReceipt('${deposit.receiptImage}')" class="pill-button-link">عرض الإيصال</button></td>
                <td data-label="الحالة"><span class="status ${statusClass}">${statusText}</span></td>
                <td data-label="إجراءات" class="action-buttons">
                    ${deposit.status === 'pending' ? `
                        <button class="pill-button-icon approve-btn" data-tooltip="موافقة"><i class="ph-bold ph-check-circle"></i></button>
                        <button class="pill-button-icon reject-btn" data-tooltip="رفض"><i class="ph-bold ph-x-circle"></i></button>
                    ` : 'تمت المعالجة'}
                </td>
            `;
            depositsTbody.appendChild(row);
        });
        document.querySelectorAll('.approve-btn, .reject-btn').forEach(btn => btn.addEventListener('click', handleDepositAction));
    }

    // --- 5. معالجة الأحداث ---

    async function handleStatusChange(event) {
        const selectElement = event.target;
        const orderId = selectElement.dataset.orderId;
        const newStatus = selectElement.value;
        selectElement.disabled = true;
        try {
            await fetch(`/api/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
        } catch (error) {
            alert('فشل تحديث حالة الطلب');
        } finally {
            selectElement.disabled = false;
        }
    }

    addServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceData = Object.fromEntries(new FormData(addServiceForm).entries());
        try {
            const response = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serviceData) });
            const result = await response.json();
            serviceFormResponse.textContent = result.message || 'تمت إضافة الخدمة بنجاح!';
            serviceFormResponse.style.color = response.ok ? 'var(--success-green)' : 'var(--danger-red)';
            if (response.ok) addServiceForm.reset();
        } catch (error) {
            serviceFormResponse.textContent = 'فشل الاتصال بالخادم.';
            serviceFormResponse.style.color = 'var(--danger-red)';
        }
    });

    async function handleDeleteService(event) {
        const row = event.currentTarget.closest('tr');
        const service = JSON.parse(row.dataset.service);
        if (!confirm(`هل أنت متأكد من حذف خدمة "${service.name}"؟`)) return;
        try {
            await fetch(`/api/services/${service._id}`, { method: 'DELETE' });
        } catch (error) { alert('فشل الاتصال بالخادم.'); }
    }

    function handleOpenEditPopup(event) {
        const row = event.currentTarget.closest('tr');
        const service = JSON.parse(row.dataset.service);
        document.getElementById('edit-service-id').value = service._id;
        document.getElementById('edit-platform').value = service.platform;
        document.getElementById('edit-name').value = service.name;
        document.getElementById('edit-price').value = service.pricePer1000;
        document.getElementById('edit-min').value = service.min;
        document.getElementById('edit-max').value = service.max;
        document.getElementById('edit-step').value = service.step || 1;
        editServicePopup.classList.remove('hidden');
    }

    editServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-service-id').value;
        const updatedData = Object.fromEntries(new FormData(editServiceForm).entries());
        delete updatedData['edit-service-id'];
        try {
            const response = await fetch(`/api/services/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData) });
            if (response.ok) {
                editServicePopup.classList.add('hidden');
            } else {
                alert('فشل تعديل الخدمة.');
            }
        } catch (error) { alert('فشل الاتصال بالخادم.'); }
    });

    closeEditPopupBtn.addEventListener('click', () => editServicePopup.classList.add('hidden'));

    async function handleDepositAction(event) {
        const btn = event.currentTarget;
        const action = btn.classList.contains('approve-btn') ? 'approve' : 'reject';
        const row = btn.closest('tr');
        const depositId = row.dataset.depositId;
        if (!confirm(`هل أنت متأكد من ${action === 'approve' ? 'الموافقة على' : 'رفض'} هذا الطلب؟`)) return;
        btn.disabled = true;
        try {
            await fetch(`/api/deposits/${action}/${depositId}`, { method: 'PUT' });
        } catch (error) {
            alert('فشل الإجراء.');
            btn.disabled = false;
        }
    }

    // --- 6. الاستماع للتحديثات الفورية (Socket.IO) ---
    function setupSocketListeners() {
        socket.on('stats-updated', (stats) => renderStats(stats));
        socket.on('new-order', () => {
            fetchData('/api/orders', renderOrders, ordersTbody);
            fetchData('/api/stats', renderStats, statsContainer);
        });
        socket.on('order-status-updated', () => {
            fetchData('/api/orders', renderOrders, ordersTbody);
            fetchData('/api/stats', renderStats, statsContainer);
        });
        socket.on('service-updated', () => fetchData('/api/services', renderServices, servicesTbody));
        socket.on('new-deposit', () => {
            fetchData('/api/deposits', renderDeposits, depositsTbody);
            fetchData('/api/stats', renderStats, statsContainer);
        });
        socket.on('deposit-updated', () => {
            fetchData('/api/deposits', renderDeposits, depositsTbody);
            fetchData('/api/stats', renderStats, statsContainer);
        });
    }

    // --- 7. التحميل الأولي ---
    function loadInitialData() {
        fetchData('/api/stats', renderStats, statsContainer);
        fetchData('/api/orders', renderOrders, ordersTbody);
        fetchData('/api/services', renderServices, servicesTbody);
        fetchData('/api/deposits', renderDeposits, depositsTbody);
        
        // تفعيل القسم الأول (لوحة المعلومات) بشكل افتراضي
        document.querySelector('.sidebar-nav .nav-link[href="#dashboard"]').click();
    }
});
