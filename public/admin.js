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
    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// 🆕 دالة تصدير الإيميلات
async function handleExportEmails() {
    const button = document.getElementById('export-emails-btn');
    if (!button) return;
    
    const originalText = button.innerHTML;
    
    try {
        button.innerHTML = '<i class="ph-bold ph-circle-notch animate-spin"></i> جاري التصدير...';
        button.disabled = true;
        
        const response = await fetch('/api/admin/users/emails', {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('فشل تصدير الإيميلات');
        }
        
        // تحميل الملف
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_emails_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        // إظهار رسالة نجاح
        showExportSuccess();
        
    } catch (error) {
        console.error('Export error:', error);
        alert('فشل تصدير الإيميلات: ' + error.message);
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 🆕 دالة إظهار رسالة نجاح التصدير
function showExportSuccess() {
    const successHTML = `
        <div class="export-success-message" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-green);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-card);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        ">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph-bold ph-check-circle"></i>
                <span>تم تصدير الإيميلات بنجاح!</span>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successHTML);
    
    setTimeout(() => {
        const message = document.querySelector('.export-success-message');
        if (message) {
            message.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => message.remove(), 300);
        }
    }, 3000);
}

// 🆕 أضف الـ CSS animations
if (!document.querySelector('#admin-animations')) {
    const style = document.createElement('style');
    style.id = 'admin-animations';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// ===============================================
// ******** بدء تشغيل السكربت (DOMContentLoaded) ********
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- عناصر الصفحة العامة ---
    const loginOverlay = document.getElementById('login-overlay');
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

    // دالة مجمعة لجلب جميع البيانات
    function loadDashboardData() {
        fetchStats();
        fetchOrders();
        fetchServices();
        fetchDeposits();
        fetchUsers();
    }

    // دالة التحقق من صلاحيات الأدمن والتوكن
    function checkAdminAccess() {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = localStorage.getItem('token');
        const loginOverlay = document.getElementById('login-overlay');
        const adminDashboard = document.getElementById('admin-dashboard');

        console.log('--- Admin Access Check Values ---');
        console.log('userInfo exists:', !!userInfo);
        console.log('token exists:', !!token);
        console.log('isAdmin value:', userInfo ? userInfo.isAdmin : 'N/A');
        console.log('Condition result:', userInfo && token && (userInfo.isAdmin === true || userInfo.isAdmin === 'true'));

        if (userInfo && token && (userInfo.isAdmin === true || userInfo.isAdmin === 'true')) {
            loginOverlay.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            loadDashboardData();
        } else {
            alert('غير مصرح لك بالدخول إلى لوحة التحكم. يرجى تسجيل الدخول بحساب مدير.');
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            window.location.href = '/index.html#login';
        }
    }

    // 🆕 أضف event listener لزر تصدير الإيميلات
    document.addEventListener('click', function(e) {
        if (e.target.closest('#export-emails-btn')) {
            handleExportEmails();
        }
    });

    // --- 2. نظام الدخول والتنقل ---
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

    // --- 3. قسم الإحصائيات ---
    async function fetchStats() {
        statsContainer.innerHTML = '<div class="stat-card loading"></div><div class="stat-card loading"></div><div class="stat-card loading"></div><div class="stat-card loading"></div>';
        try {
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

    // --- 4. قسم إدارة الطلبات ---
    async function fetchOrders() {
        loadingSpinner.classList.remove('hidden');
        ordersTbody.innerHTML = '';
        try {
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
                <td data-label="الرابط">
                    <div class="link-container">
                        <a href="${order.link || '#'}" target="_blank" class="link-preview">عرض الرابط</a>
                        <button class="copy-link-btn" data-link="${order.link}" title="نسخ الرابط">
                            <i class="ph-bold ph-copy"></i>
                        </button>
                    </div>
                </td>
                <td data-label="الكمية">${order.quantity ? order.quantity.toLocaleString() : 'N/A'}</td>
                <td data-label="السعر">${order.price ? order.price.toFixed(2) : '0.00'} $</td>
                <td data-label="تاريخ الطلب">${order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : 'N/A'}</td>
                <td data-label="الحالة"><div class="select-wrapper status-select-wrapper"><select class="status-select" data-order-id="${order._id}"><option value="قيد المراجعة" ${order.status === 'قيد المراجعة' ? 'selected' : ''}>قيد المراجعة</option><option value="قيد التنفيذ" ${order.status === 'قيد التنفيذ' ? 'selected' : ''}>قيد التنفيذ</option><option value="مكتمل" ${order.status === 'مكتمل' ? 'selected' : ''}>مكتمل</option><option value="ملغي" ${order.status === 'ملغي' ? 'selected' : ''}>ملغي</option></select></div></td>
            `;
            ordersTbody.appendChild(row);
        });
        
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', handleStatusChange);
        });
        
        document.querySelectorAll('.copy-link-btn').forEach(btn => {
            btn.addEventListener('click', handleCopyLink);
        });
    }

    async function handleCopyLink(event) {
        const button = event.currentTarget;
        const link = button.getAttribute('data-link');
        
        if (!link) {
            console.error('No link found');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(link);
            
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="ph-bold ph-check"></i>';
            button.style.background = 'var(--success-green)';
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.background = '';
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy: ', err);
            const textArea = document.createElement('textarea');
            textArea.value = link;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            button.innerHTML = '<i class="ph-bold ph-check"></i>';
            button.style.background = 'var(--success-green)';
            setTimeout(() => {
                button.innerHTML = '<i class="ph-bold ph-copy"></i>';
                button.style.background = '';
            }, 2000);
        }
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
                headers: getAuthHeaders(),
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

    // --- 5. قسم إدارة الخدمات ---
    async function fetchServices() {
        try {
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
            row.dataset.service = JSON.stringify(service);

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
            const response = await fetch('/api/services', { 
                method: 'POST', 
                headers: getAuthHeaders(),
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
            const response = await fetch(`/api/services/${service.id}`, { 
                method: 'DELETE',
                headers: getAuthHeaders()
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
            const response = await fetch(`/api/services/${id}`, { 
                method: 'PUT', 
                headers: getAuthHeaders(),
                body: JSON.stringify(updatedData) 
            });
            if (response.ok) {
                editServicePopup.classList.add('hidden');
                fetchServices();
            } else {
                alert('فشل تعديل الخدمة.');
            }
        } catch (error) { alert('فشل الاتصال بالخادم.'); }
    });

    closeEditPopupBtn.addEventListener('click', () => editServicePopup.classList.add('hidden'));

    // --- 6. قسم إدارة طلبات الشحن ---
    async function fetchDeposits() {
        if (!depositsTbody) return;
        depositsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">جاري تحميل...</td></tr>';
        try {
            const response = await fetch('/api/deposits', { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('فشل جلب طلبات الشحن.');
            const deposits = await response.json();
            renderDeposits(deposits);
        } catch (error) {
            depositsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    }

    // 🆕 دوال إدارة العروض
async function fetchOffers() {
    try {
        const response = await fetch('/api/offers', { 
            headers: getAuthHeaders() 
        });
        if (!response.ok) throw new Error('فشل جلب العروض');
        const offers = await response.json();
        renderOffers(offers);
    } catch (error) {
        console.error('Error fetching offers:', error);
    }
}

function renderOffers(offers) {
    const tbody = document.getElementById('offers-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = offers.map(offer => {
        const now = new Date();
        const startDate = new Date(offer.startDate);
        const endDate = new Date(offer.endDate);
        const isActive = offer.isActive && now >= startDate && now <= endDate;
        const isUpcoming = now < startDate;
        
        const statusClass = isActive ? 'status status-مكتمل' : 
                            isUpcoming ? 'status status-قيد-المراجعة' : 
                            'status status-ملغي';
        
        const statusText = isActive ? 'نشط' : 
                          isUpcoming ? 'قادم' : 
                          'منتهي';
        
        const discountText = offer.discountPercentage ? 
            `خصم ${offer.discountPercentage}%` : 
            offer.discountAmount ? 
            `وفر ${offer.discountAmount}$` : 
            'عرض خاص';
        
        const periodText = `${new Date(offer.startDate).toLocaleDateString('ar-EG')} - ${new Date(offer.endDate).toLocaleDateString('ar-EG')}`;
        
        const targetText = {
            'all': 'الجميع',
            'new': 'جدد فقط',
            'existing': 'حاليون فقط'
        }[offer.targetUsers] || offer.targetUsers;

        return `
            <tr>
                <td>${offer.title}</td>
                <td>${offer.description}</td>
                <td>${discountText}</td>
                <td>${periodText}</td>
                <td>${targetText}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td class="action-buttons">
                    <button class="edit-offer-btn pill-button" data-offer-id="${offer._id}">
                        <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                    <button class="delete-offer-btn pill-button" data-offer-id="${offer._id}">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // ربط أحداث الأزرار
    document.querySelectorAll('.delete-offer-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteOffer);
    });
    
    document.querySelectorAll('.edit-offer-btn').forEach(btn => {
        btn.addEventListener('click', handleEditOffer);
    });
}

// 🆕 دالة إضافة عرض جديد
// 🆕 دالة إضافة عرض جديد - معدلة للتشخيص
async function handleAddOffer(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('offer-title').value,
        description: document.getElementById('offer-description').value,
        discountPercentage: document.getElementById('offer-discount-percentage').value ? 
            parseInt(document.getElementById('offer-discount-percentage').value) : undefined,
        discountAmount: document.getElementById('offer-discount-amount').value ? 
            parseFloat(document.getElementById('offer-discount-amount').value) : undefined,
        startDate: new Date(document.getElementById('offer-start-date').value),
        endDate: new Date(document.getElementById('offer-end-date').value),
        targetUsers: document.getElementById('offer-target-users').value,
        services: Array.from(document.getElementById('offer-services').selectedOptions).map(opt => opt.value)
    };
    
    console.log('📦 بيانات العرض المرسلة:', formData);
    
    try {
        const response = await fetch('/api/offers', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        console.log('📡 استجابة السيرفر:', response.status);
        
        const result = await response.json();
        console.log('📄 بيانات الاستجابة:', result);
        
        if (response.ok) {
            document.getElementById('offer-form-response').textContent = result.message;
            document.getElementById('offer-form-response').style.color = 'green';
            document.getElementById('add-offer-form').reset();
            fetchOffers(); // تحديث القائمة
        } else {
            throw new Error(result.message || 'فشل إنشاء العرض');
        }
    } catch (error) {
        console.error('❌ خطأ في إنشاء العرض:', error);
        document.getElementById('offer-form-response').textContent = error.message;
        document.getElementById('offer-form-response').style.color = 'red';
    }
}

// 🆕 دالة حذف عرض
// 🆕 دالة حذف عرض - محدثة
async function handleDeleteOffer(event) {
    const offerId = event.currentTarget.dataset.offerId;
    
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟ سيتم إلغاء الإشعارات المرتبطة به.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/offers/${offerId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('فشل حذف العرض');
        
        // 🆕 إزالة الصف من الجدول فوراً بدون إعادة تحميل
        const row = event.currentTarget.closest('tr');
        if (row) {
            row.style.opacity = '0';
            setTimeout(() => {
                row.remove();
                // إذا لم يتبقى عروض، أظهر رسالة
                const tbody = document.getElementById('offers-tbody');
                if (tbody && tbody.children.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">لا توجد عروض حالياً.</td></tr>';
                }
            }, 300);
        }
        
        // 🆕 إرسال إشعار لتحديث الصفحة الرئيسية
        socket.emit('offer-deleted');
        
    } catch (error) {
        alert(error.message);
    }
}

// 🆕 دالة تعديل عرض (يمكن تطويرها لاحقاً)
async function handleEditOffer(event) {
    const offerId = event.currentTarget.dataset.offerId;
    alert(`سيتم تطوير خاصية تعديل العرض ${offerId} في المستقبل`);
}

// 🆕 دالة تعبئة قائمة الخدمات
async function loadServicesForOffers() {
    try {
        const response = await fetch('/api/services', { 
            headers: getAuthHeaders() 
        });
        if (!response.ok) return;
        
        const services = await response.json();
        const servicesSelect = document.getElementById('offer-services');
        
        if (servicesSelect) {
            servicesSelect.innerHTML = services.map(service => 
                `<option value="${service.id}">${service.platform} - ${service.name} (${service.pricePer1000}$)</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading services for offers:', error);
    }
}

    // --- قسم إدارة المستخدمين ---
    async function fetchUsers() {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">جاري التحميل...</td></tr>';
        
        try {
            const response = await fetch('/api/admin/users', { 
                headers: getAuthHeaders() 
            });
            
            if (!response.ok) {
                throw new Error(`فشل جلب المستخدمين: ${response.status}`);
            }
            
            const users = await response.json();
            renderUsers(users);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">${error.message}</td></tr>`;
        }
    }

    function renderUsers(users) {
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.username || 'غير محدد'}</td>
                <td>${user.email || 'غير محدد'}</td>
                <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}</td>
                <td><span class="status ${user.emailVerified ? 'status-approved' : 'status-pending'}">${user.emailVerified ? 'مفعل' : 'غير مفعل'}</span></td>
                <td>${user.balance ? user.balance.toFixed(2) : '0.00'} $</td>
                <td class="action-buttons">
                    <button class="edit-user-btn pill-button" data-user-id="${user._id}" data-user-data='${JSON.stringify(user)}'>
                        <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', handleEditUser);
        });
    }

    function handleEditUser(event) {
        const button = event.currentTarget;
        const userData = JSON.parse(button.getAttribute('data-user-data'));
        showEditUserModal(userData);
    }

    function showEditUserModal(user) {
        const modalHTML = `
            <div id="edit-user-modal" class="popup-overlay" style="display: flex;">
                <div class="popup-content" style="max-width: 500px;">
                    <button class="close-btn" id="close-edit-user-modal">
                        <i class="ph-bold ph-x"></i>
                    </button>
                    <div class="popup-header">
                        <i class="ph-bold ph-user"></i>
                        <h2>تعديل بيانات المستخدم</h2>
                    </div>
                    <form id="edit-user-form">
                        <input type="hidden" id="edit-user-id" value="${user._id}">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>اسم المستخدم</label>
                                <input type="text" id="edit-username" value="${user.username || ''}" required>
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" id="edit-email" value="${user.email || ''}" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>الرصيد ($)</label>
                                <input type="number" id="edit-balance" value="${user.balance || 0}" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label>الحالة</label>
                                <select id="edit-status">
                                    <option value="active" ${user.emailVerified ? 'selected' : ''}>نشط</option>
                                    <option value="inactive" ${!user.emailVerified ? 'selected' : ''}>غير نشط</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="edit-isAdmin" ${user.isAdmin ? 'checked' : ''}>
                                <span class="checkmark"></span>
                                صلاحيات الأدمن
                            </label>
                        </div>
                        
                        <div class="form-actions" style="display: flex; gap: 1rem; margin-top: 2rem;">
                            <button type="submit" class="pill-button primary-button">حفظ التغييرات</button>
                            <button type="button" id="cancel-edit-user" class="pill-button secondary-button">إلغاء</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        document.getElementById('edit-user-form').addEventListener('submit', handleUpdateUser);
        document.getElementById('close-edit-user-modal').addEventListener('click', closeEditUserModal);
        document.getElementById('cancel-edit-user').addEventListener('click', closeEditUserModal);
        
        document.getElementById('edit-user-modal').addEventListener('click', function(e) {
            if (e.target === this) closeEditUserModal();
        });
    }

    async function handleUpdateUser(event) {
        event.preventDefault();
        
        const userId = document.getElementById('edit-user-id').value;
        const formData = {
            username: document.getElementById('edit-username').value,
            email: document.getElementById('edit-email').value,
            balance: parseFloat(document.getElementById('edit-balance').value),
            emailVerified: document.getElementById('edit-status').value === 'active',
            isAdmin: document.getElementById('edit-isAdmin').checked
        };
        
        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error('فشل تحديث بيانات المستخدم');
            }
            
            const result = await response.json();
            alert('تم تحديث بيانات المستخدم بنجاح!');
            closeEditUserModal();
            fetchUsers();
            
        } catch (error) {
            console.error('Error updating user:', error);
            alert('فشل تحديث بيانات المستخدم: ' + error.message);
        }
    }

    function closeEditUserModal() {
        const modal = document.getElementById('edit-user-modal');
        if (modal) {
            modal.remove();
        }
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
                    <button class="approve-btn pill-button"><i class="ph-bold ph-check"></i> قبول</button>
                    <button class="reject-btn pill-button"><i class="ph-bold ph-x"></i> رفض</button>
                    ` : 'تمت المعالجة'}
                </td>
            `;
            depositsTbody.appendChild(row);
        });
        
        document.querySelectorAll('.approve-btn, .reject-btn').forEach(btn => {
            btn.addEventListener('click', handleDepositAction);
        });
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
            const response = await fetch(`/api/deposits/${depositId}/${action}`, { 
                method: 'PUT',
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.message || 'فشل الإجراء.');
            }
            
            fetchDeposits();
            
        } catch (error) {
            alert(error.message);
            btn.disabled = false;
            btn.textContent = action === 'approve' ? 'قبول' : 'رفض';
        }
    }

    // 🆕 ربط أحداث إدارة العروض
const addOfferForm = document.getElementById('add-offer-form');
if (addOfferForm) {
    addOfferForm.addEventListener('submit', handleAddOffer);
}

// 🆕 تعبئة حقول التاريخ بالقيم الافتراضية
const now = new Date();
const startDate = new Date(now.getTime() + (60 * 60 * 1000)); // بعد ساعة من الآن
const endDate = new Date(now.getTime() + (48 * 60 * 60 * 1000)); // بعد 48 ساعة

document.getElementById('offer-start-date').value = startDate.toISOString().slice(0, 16);
document.getElementById('offer-end-date').value = endDate.toISOString().slice(0, 16);

// 🆕 تحميل الخدمات والعروض
loadServicesForOffers();
fetchOffers();

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
    
    // تشغيل التحقق من الصلاحيات عند تحميل الصفحة
    checkAdminAccess();
});
