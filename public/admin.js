// الصق الدالة هنا في الخارج لتصبح عامة
function viewReceipt(base64Image) {
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(`
            <html><head><title>عرض الإيصال</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; background-color:#333;">
            <img src="${base64Image}" style="max-width:100%; max-height:100vh;"></body></html>
        `);
        newWindow.document.close();
    }
}

// ===============================================
// ******** الدوال المساعدة للأمان (الجديدة) ********
// ===============================================

// دالة لجلب الـ Headers اللازمة لإرسال التوكن مع كل طلب
function getAuthHeaders(extraHeaders = {}) {
    const token = localStorage.getItem('token');
    // إذا لم يكن هناك توكن، فإن السيرفر سيقوم برفض الطلب، لكن نرسل Content-Type لعمليات POST/PUT
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// دالة مجمعة لجلب جميع البيانات
function loadDashboardData() {
    fetchStats();
    fetchOrders();
    fetchServices();
    fetchDeposits();
}

// دالة التحقق من صلاحيات الأدمن والتوكن
function checkAdminAccess() {
    // 1. جلب بيانات المستخدم من التخزين المحلي
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const token = localStorage.getItem('token');
    const loginOverlay = document.getElementById('login-overlay');
    const adminDashboard = document.getElementById('admin-dashboard');

    // ******** إضافة مؤقتة للتحقق (هذه هي النقطة الحاسمة) ********
    console.log('--- Admin Access Check Values ---');
    console.log('userInfo exists:', !!userInfo); // يجب أن تكون: true
    console.log('token exists:', !!token); // يجب أن تكون: true
    console.log('isAdmin value:', userInfo ? userInfo.isAdmin : 'N/A'); // يجب أن تكون: true
    console.log('Condition result:', userInfo && token && (userInfo.isAdmin === true || userInfo.isAdmin === 'true'));
    // *********************************************************

    // 2. التحقق من وجود بيانات المستخدم والتوكن وصلاحية الأدمن
    if (userInfo && token && (userInfo.isAdmin === true || userInfo.isAdmin === 'true')) {
        // ... (كود السماح بالدخول)
        loginOverlay.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        loadDashboardData();
    } else {
        // ... (كود الرفض)
        alert('غير مصرح لك بالدخول إلى لوحة التحكم. يرجى تسجيل الدخول بحساب مدير.');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = '/index.html#login';
    }
}

// ===============================================
// ******** بدء تشغيل السكربت (DOMContentLoaded) ********
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- عناصر الصفحة العامة ---
    const loginOverlay = document.getElementById('login-overlay');
    // تم حذف loginForm, passwordInput, loginError لأنها لم تعد تستخدم
    const adminDashboard = document.getElementById('admin-dashboard');
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const sections = document.querySelectorAll('.admin-section');
    const statsContainer = document.getElementById('stats-cards-container');
    const ordersTbody = document.getElementById('orders-tbody');
    const loadingSpinner = document.getElementById('loading-spinner');
    const depositsTbody = document.getElementById('deposits-tbody');
    const addServiceForm = document.getElementById('add-service-form');
    const serviceFormResponse = document.getElementById('service-form-response');
    const servicesTbody = document.getElementById('services-tbody');
    const editServicePopup = document.getElementById('edit-service-popup');
    const editServiceForm = document.getElementById('edit-service-form');
    const closeEditPopupBtn = document.getElementById('close-edit-popup-btn');

    // تم حذف const ADMIN_PASSWORD = "password123";

    // --- 2. نظام الدخول والتنقل (تم تعديله) ---
    // تم حذف eventListener القديم لتسجيل الدخول

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

    // --- 3. قسم الإحصائيات (تم تحديثها لطلب التوكن) ---
    async function fetchStats() {
        statsContainer.innerHTML = '<div class="stat-card loading"></div><div class="stat-card loading"></div><div class="stat-card loading"></div><div class="stat-card loading"></div>';
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch('/api/stats', { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('فشل جلب الإحصائيات. (قد تكون الصلاحيات غير كافية).');
            const stats = await response.json();
            renderStats(stats);
        } catch (error) {
            statsContainer.innerHTML = `<p style="color:red; grid-column: 1 / -1;">${error.message}</p>`;
        }
    }

    function renderStats(stats) {
        statsContainer.innerHTML = `
            <div class="stat-card"><div class="stat-icon" style="background-color: #e6f2ff;"><i class="ph-bold ph-wallet" style="color: #007bff;"></i></div><div class="stat-info"><p>إجمالي الدخل</p><h3>${stats.totalRevenue.toFixed(2)} $</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background-color: #e4f8f0;"><i class="ph-bold ph-check-circle" style="color: #28a745;"></i></div><div class="stat-info"><p>الطلبات المكتملة</p><h3>${stats.completedOrders}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background-color: #fff8e1;"><i class="ph-bold ph-timer" style="color: #ffc107;"></i></div><div class="stat-info"><p>الطلبات قيد المعالجة</p><h3>${stats.pendingOrders}</h3></div></div>
            <div class="stat-card"><div class="stat-icon" style="background-color: #f3e8ff;"><i class="ph-bold ph-shopping-cart-simple" style="color: #6f42c1;"></i></div><div class="stat-info"><p>إجمالي الطلبات</p><h3>${stats.totalOrders}</h3></div></div>
        `;
    }

    // --- 4. قسم إدارة الطلبات (تم تحديثها لطلب التوكن) ---
    async function fetchOrders() {
        loadingSpinner.classList.remove('hidden');
        ordersTbody.innerHTML = '';
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch('/api/orders', { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('فشل جلب الطلبات. (قد تكون الصلاحيات غير كافية).');
            const orders = await response.json();
            renderOrders(orders);
        } catch (error) {
            alert(error.message);
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    function renderOrders(orders) {
    ordersTbody.innerHTML = '';
    if (orders.length === 0) { ordersTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات حالياً.</td></tr>'; return; }
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
            <td data-label="الحالة"><div class="select-wrapper status-select-wrapper"><select class="status-select" data-order-id="${order._id}"><option value="قيد المراجعة" ${order.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option><option value="قيد التنفيذ" ${order.status === 'قيد التنفيذ' ? 'selected' : ''}>قيد التنفيذ</option><option value="مكتمل" ${order.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option><option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option></select></div></td>
        `;
        ordersTbody.appendChild(row);
    });
    document.querySelectorAll('.status-select').forEach(select => select.addEventListener('change', handleStatusChange));
}

    async function handleStatusChange(event) {
        const selectElement = event.target;
        const orderId = selectElement.dataset.orderId;
        const newStatus = selectElement.value;
        const row = selectElement.closest('tr');
        selectElement.disabled = true;
        row.style.opacity = '0.5';
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch(`/api/orders/${orderId}`, { 
                method: 'PUT', 
                headers: getAuthHeaders(), // استخدام الدالة المساعدة
                body: JSON.stringify({ status: newStatus }) 
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

    // --- 5. قسم إدارة الخدمات (تم تحديثها لطلب التوكن) ---
    async function fetchServices() {
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch('/api/services', { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('فشل جلب الخدمات. (قد تكون الصلاحيات غير كافية).');
            const services = await response.json();
            renderServices(services);
        } catch (error) { console.error('Failed to fetch services:', error); }
    }

    function renderServices(services) {
    servicesTbody.innerHTML = '';
    if (!Array.isArray(services) || services.length === 0) {
        servicesTbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد خدمات مضافة.</td></tr>';
        return;
    }

    services.forEach(service => {
        const row = document.createElement('tr');
        // store the full service object for later actions
        row.dataset.service = JSON.stringify(service);

        // ensure fields exist and have safe defaults
        const platform = service.platform || 'غير محدد';
        const name = service.name || 'اسم غير معروف';
        const price = (typeof service.pricePer1000 === 'number') ? service.pricePer1000.toFixed(2) : (service.pricePer1000 || '0.00');
        const min = service.min ? service.min.toLocaleString() : '-';
        const max = service.max ? service.max.toLocaleString() : '-';
        const step = service.step || service.step === 0 ? service.step : (service.multiple || 1);

        row.innerHTML = `
            <td data-label="المنصة">${platform}</td>
            <td data-label="الخدمة">${name}</td>
            <td data-label="السعر/1000">${price} $</td>
            <td data-label="أدنى/أقصى حد">${min} / ${max}</td>
            <td data-label="الخطوة">${step}</td>
            <td data-label="إجراءات" class="action-buttons">
                <button class="edit-btn pill-button" title="تعديل"><i class="ph-bold ph-pencil-simple"></i><span class="sr-only">تعديل</span></button>
                <button class="delete-btn pill-button" title="حذف"><i class="ph-bold ph-trash"></i><span class="sr-only">حذف</span></button>
            </td>
        `;
        servicesTbody.appendChild(row);
    });

    // Attach handlers (re-bind safely: remove previous listeners if any)
    // Simple approach: query and add listeners (listeners are lightweight here)
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteService);
        btn.addEventListener('click', handleDeleteService);
    });
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.removeEventListener('click', handleOpenEditPopup);
        btn.addEventListener('click', handleOpenEditPopup);
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
            step: parseInt(document.getElementById('service-step').value) || 1
        };
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch('/api/services', { 
                method: 'POST', 
                headers: getAuthHeaders(), // استخدام الدالة المساعدة
                body: JSON.stringify(serviceData) 
            });
            const result = await response.json();
            serviceFormResponse.textContent = result.message;
            if (response.ok) {
                serviceFormResponse.style.color = 'green';
                addServiceForm.reset();
            } else {
                serviceFormResponse.style.color = 'red';
            }
        } catch (error) {
            serviceFormResponse.textContent = 'فشل الاتصال بالخادم.';
            serviceFormResponse.style.color = 'red';
        }
    });

    async function handleDeleteService(event) {
        const row = event.currentTarget.closest('tr');
        const service = JSON.parse(row.dataset.service);
        if (!confirm(`هل أنت متأكد من حذف خدمة "${service.name}"؟`)) return;
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch(`/api/services/${service.id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders() // استخدام الدالة المساعدة
            });
            if (!response.ok) alert('فشل حذف الخدمة.');
        } catch (error) { alert('فشل الاتصال بالخادم.'); }
    }

    function handleOpenEditPopup(event) {
        const row = event.currentTarget.closest('tr');
        const service = JSON.parse(row.dataset.service);
        editServiceForm.innerHTML = `
            <input type="hidden" id="edit-service-id" value="${service.id}">
            <div class="form-group"><label>المنصة</label><input type="text" id="edit-platform" value="${service.platform}" required></div>
            <div class="form-group"><label>اسم الخدمة</label><input type="text" id="edit-name" value="${service.name}" required></div>
            <div class="form-group"><label>السعر لكل 1000</label><input type="number" id="edit-price" value="${service.pricePer1000}" step="0.01" required></div>
            <div class="form-group"><label>الحد الأدنى</label><input type="number" id="edit-min" value="${service.min}" required></div>
            <div class="form-group"><label>الحد الأقصى</label><input type="number" id="edit-max" value="${service.max}" required></div>
            <div class="form-group"><label>الخطوة (المضاعف)</label><input type="number" id="edit-step" value="${service.step || 1}" required></div>
            <button type="submit" class="pill-button primary-button">حفظ التغييرات</button>
        `;
        editServicePopup.classList.remove('hidden');
    }

    editServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-service-id').value;
        const updatedData = {
            platform: document.getElementById('edit-platform').value.trim(),
            name: document.getElementById('edit-name').value.trim(),
            pricePer1000: parseFloat(document.getElementById('edit-price').value),
            min: parseInt(document.getElementById('edit-min').value),
            max: parseInt(document.getElementById('edit-max').value),
            step: parseInt(document.getElementById('edit-step').value) || 1
        };
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch(`/api/services/${id}`, { 
                method: 'PUT', 
                headers: getAuthHeaders(), // استخدام الدالة المساعدة
                body: JSON.stringify(updatedData) 
            });
            if (response.ok) {
                editServicePopup.classList.add('hidden');
                // تحديث الخدمات بعد التعديل
                fetchServices(); 
            } else {
                alert('فشل تعديل الخدمة.');
            }
        } catch (error) { alert('فشل الاتصال بالخادم.'); }
    });

    closeEditPopupBtn.addEventListener('click', () => editServicePopup.classList.add('hidden'));

    // --- 6. قسم إدارة طلبات الشحن (تم تحديثها لطلب التوكن) ---
    async function fetchDeposits() {
        if (!depositsTbody) return;
        depositsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري تحميل...</td></tr>';
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch('/api/deposits', { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('فشل جلب طلبات الشحن. (قد تكون الصلاحيات غير كافية).');
            const deposits = await response.json();
            renderDeposits(deposits);
        } catch (error) {
            depositsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    }

    function renderDeposits(deposits) {
    if (!depositsTbody) return;
    depositsTbody.innerHTML = '';
    if (deposits.length === 0) { depositsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد طلبات شحن حالياً.</td></tr>'; return; }
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
            <button class="approve-btn pill-button"><i class="ph-bold ph-check"></i> قبول</button>
            <button class="reject-btn pill-button"><i class="ph-bold ph-x"></i> رفض</button>
           ` : 'تمت المعالجة'}
         </td>

        `;
        depositsTbody.appendChild(row);
    });
    document.querySelectorAll('.approve-btn, .reject-btn').forEach(btn => btn.addEventListener('click', handleDepositAction));
}


    async function handleDepositAction(event) {
        const btn = event.currentTarget;
        const action = btn.classList.contains('approve-btn') ? 'approve' : 'reject';
        const row = btn.closest('tr');
        const depositId = row.dataset.depositId;
        if (!confirm(`هل أنت متأكد من ${action === 'approve' ? 'الموافقة على' : 'رفض'} هذا الطلب؟`)) return;
        btn.disabled = true;
        btn.textContent = 'جاري...';
        try {
            // التعديل هنا: إضافة الـ Headers
            const response = await fetch(`/api/deposits/${depositId}/${action}`, { 
                method: 'PUT',
                headers: getAuthHeaders() // استخدام الدالة المساعدة
            });
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'فشل الإجراء.');
            }
        } catch (error) {
            alert(error.message);
            btn.disabled = false;
        }
    }

    // --- 7. الاستماع للتحديثات الفورية (Socket.IO) ---
    socket.on('new-order', () => {
        console.log('New order received! Refreshing...');
        fetchOrders();
        fetchStats();
    });
    socket.on('new-deposit', () => {
        console.log('New deposit request received! Refreshing...');
        fetchDeposits();
    });
    socket.on('new-service', fetchServices);
    socket.on('service-updated', fetchServices);
    socket.on('service-deleted', fetchServices);
    
    // ******** إضافة جديدة: تشغيل التحقق من الصلاحيات عند تحميل الصفحة ********
    checkAdminAccess();
});
