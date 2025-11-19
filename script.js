// المتغيرات العامة
let currentUser = null;
let token = localStorage.getItem('token');
const API_BASE = '/api';
// تهيئة التطبيق
// تهيئة التطبيق - النسخة المصححة
function initializeApp() {
    const currentPage = window.location.pathname.split('/').pop();
    
    console.log('🚀 تهيئة الصفحة:', currentPage);
    console.log('📝 التوكن:', localStorage.getItem('token'));
    console.log('👤 المستخدم:', JSON.parse(localStorage.getItem('userData')));
    
    // تحقق من التوكن بدون إعادة توجيه تلقائية
    verifyToken().then(isValid => {
        if (!isValid) {
            // فقط إذا كانت الصفحة محمية وتحتاج تسجيل دخول
            if (currentPage === 'dashboard.html' || currentPage === 'admin.html' || currentPage === 'profile.html') {
                console.log('🔒 الصفحة محمية - إعادة التوجيه لتسجيل الدخول');
                window.location.href = 'login.html';
                return;
            }
        }
        
        // تهيئة الصفحات المختلفة
        switch(currentPage) {
            case 'dashboard.html':
                initializeDashboard();
                break;
            case 'admin.html':
                initializeAdmin();
                break;
            case 'profile.html':
                initializeProfile();
                break;
            case 'login.html':
                initializeLogin();
                break;
            case 'register.html':
                initializeRegister();
                break;
        }
    });
}

// التحقق من التوكن
// التحقق من التوكن - النسخة المصححة
async function verifyToken() {
    try {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('userData'));
        
        console.log('🔐 التحقق من التوكن...');
        console.log('📝 التوكن:', token ? 'موجود' : 'مفقود');
        console.log('👤 بيانات المستخدم:', userData);

        if (!token || !userData) {
            console.log('❌ لا يوجد توكن أو بيانات مستخدم');
            // لا تعيد التوجيه تلقائياً، دع الصفحة تحدد
            return false;
        }

        // تحقق بسيط من السيرفر
        const response = await fetch('/api/services', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ التوكن صالح');
            currentUser = userData;
            
            // ظهر رابط المشرف إذا كان دور المستخدم admin
            if (currentUser.role === 'admin') {
                const adminLink = document.getElementById('adminLink');
                if (adminLink) {
                    adminLink.style.display = 'block';
                    console.log('✅ تم تفعيل رابط المشرف');
                }
            }
            return true;
        } else {
            console.log('❌ التوكن غير صالح');
            return false;
        }
        
    } catch (error) {
        console.error('⚠️ خطأ في التحقق من التوكن:', error);
        // لا تسجل خروج تلقائياً
        return false;
    }
}

// تسجيل الدخول
function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html';
                } else {
                    showAlert(data.message, 'danger');
                }
            } catch (error) {
                showAlert('خطأ في الاتصال بالخادم', 'danger');
            }
        });
    }
}

// التسجيل
function initializeRegister() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                showAlert('كلمات المرور غير متطابقة', 'danger');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن.', 'success');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showAlert(data.message, 'danger');
                }
            } catch (error) {
                showAlert('خطأ في الاتصال بالخادم', 'danger');
            }
        });
    }
}

// لوحة التحكم
function initializeDashboard() {
    if (!currentUser) return;
    
    // تحديث معلومات المستخدم
    updateUserInfo();
    
    // تحميل الخدمات
    loadServices();
    
    // تحميل الطلبات
    loadOrders();
    
    // تحميل المعاملات
    loadTransactions();
    
    // إعداد الأحداث
    setupDashboardEvents();
}
// تحقق قبل الانتقال إلى لوحة المشرف
function checkAdminBeforeNavigate() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    console.log('🔍 تحقق قبل الانتقال للمشرف:', userData);
    
    if (!userData || userData.role !== 'admin') {
        alert('⚠️ يجب أن تكون مشرفاً للوصول إلى لوحة المشرف');
        return false; // يمنع الانتقال
    }
    
    console.log('✅ الانتقال مسموح للمشرف');
    return true; // يسمح بالانتقال
}

// تحديث معلومات المستخدم
function updateUserInfo() {
    if (currentUser) {
        const userNameElement = document.getElementById('userName');
        const userEmailElement = document.getElementById('userEmail');
        const userBalanceElement = document.getElementById('userBalance');
        
        if (userNameElement) userNameElement.textContent = currentUser.username;
        if (userEmailElement) userEmailElement.textContent = currentUser.email;
        if (userBalanceElement) userBalanceElement.textContent = `${currentUser.balance.toFixed(2)} $`;
    }
}

// تحميل الخدمات
async function loadServices() {
    try {
        const response = await fetch(`${API_BASE}/services`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const services = await response.json();
            displayServices(services);
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// عرض الخدمات
function displayServices(services) {
    const servicesList = document.getElementById('servicesList');
    if (!servicesList) return;
    
    servicesList.innerHTML = '';
    
    services.forEach(service => {
        const serviceCard = `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card service-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${service.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${service.platform}</h6>
                        <p class="card-text">${service.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="service-price">${service.price.toFixed(2)} $</span>
                            <button class="btn btn-primary btn-sm" onclick="openOrderModal('${service._id}', '${service.name}', ${service.price})">
                                <i class="fas fa-shopping-cart"></i>
                                طلب
                            </button>
                        </div>
                        <small class="text-muted">الحد الأدنى: ${service.minOrder} - الحد الأقصى: ${service.maxOrder}</small>
                    </div>
                </div>
            </div>
        `;
        servicesList.innerHTML += serviceCard;
    });
}

// فتح نموذج الطلب
function openOrderModal(serviceId, serviceName, servicePrice) {
    document.getElementById('serviceId').value = serviceId;
    document.getElementById('serviceName').value = serviceName;
    document.getElementById('quantity').value = 1;
    document.getElementById('link').value = '';
    updateTotalPrice(servicePrice, 1);
    
    const orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
    orderModal.show();
    
    // تحديث السعر عند تغيير الكمية
    document.getElementById('quantity').addEventListener('input', function() {
        updateTotalPrice(servicePrice, this.value);
    });
}

// تحديث السعر الإجمالي
function updateTotalPrice(price, quantity) {
    const totalPrice = price * quantity;
    document.getElementById('totalPrice').value = `${totalPrice.toFixed(2)} $`;
}

// تحميل الطلبات
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayOrders(orders);
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// عرض الطلبات
function displayOrders(orders) {
    const ordersTable = document.getElementById('ordersTable');
    if (!ordersTable) return;
    
    ordersTable.innerHTML = '';
    
    orders.forEach(order => {
        const statusClass = getStatusClass(order.status);
        const orderRow = `
            <tr>
                <td>${order.serviceId.name}</td>
                <td>${order.quantity}</td>
                <td>${order.totalPrice.toFixed(2)} $</td>
                <td><span class="${statusClass}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>
        `;
        ordersTable.innerHTML += orderRow;
    });
}

// تحميل المعاملات
async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/transactions`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const transactions = await response.json();
            displayTransactions(transactions);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

// عرض المعاملات
function displayTransactions(transactions) {
    const transactionsTable = document.getElementById('transactionsTable');
    if (!transactionsTable) return;
    
    transactionsTable.innerHTML = '';
    
    transactions.forEach(transaction => {
        const amountClass = transaction.amount > 0 ? 'text-success' : 'text-danger';
        const amountSign = transaction.amount > 0 ? '+' : '';
        const typeText = getTransactionTypeText(transaction.type);
        
        const transactionRow = `
            <tr>
                <td class="${amountClass}">${amountSign}${transaction.amount.toFixed(2)} $</td>
                <td>${typeText}</td>
                <td>${transaction.description}</td>
                <td>${new Date(transaction.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>
        `;
        transactionsTable.innerHTML += transactionRow;
    });
}

// إعداد أحداث لوحة التحكم
function setupDashboardEvents() {
    // شحن الرصيد
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('amount').value);
            
            try {
                const response = await fetch(`${API_BASE}/deposit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ amount })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('تم شحن الرصيد بنجاح', 'success');
                    currentUser.balance = data.newBalance;
                    updateUserInfo();
                    bootstrap.Modal.getInstance(document.getElementById('depositModal')).hide();
                    depositForm.reset();
                } else {
                    showAlert(data.message, 'danger');
                }
            } catch (error) {
                showAlert('خطأ في الاتصال بالخادم', 'danger');
            }
        });
    }
    
    // تقديم طلب
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const serviceId = document.getElementById('serviceId').value;
            const quantity = parseInt(document.getElementById('quantity').value);
            const link = document.getElementById('link').value;
            
            try {
                const response = await fetch(`${API_BASE}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ serviceId, quantity, link })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('تم إنشاء الطلب بنجاح', 'success');
                    currentUser.balance -= data.order.totalPrice;
                    updateUserInfo();
                    loadOrders();
                    loadTransactions();
                    bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
                    orderForm.reset();
                } else {
                    showAlert(data.message, 'danger');
                }
            } catch (error) {
                showAlert('خطأ في الاتصال بالخادم', 'danger');
            }
        });
    }
    
    // تسجيل الخروج
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// لوحة المشرف
function initializeAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }
    
    loadAdminData();
    setupAdminEvents();
}

// تحميل بيانات المشرف
async function loadAdminData() {
    await loadAdminOverview();
    await loadAdminOrders();
    await loadAdminUsers();
    await loadAdminServices();
}

// نظرة عامة للمشرف
async function loadAdminOverview() {
    try {
        // تحميل الإحصائيات
        const [usersResponse, ordersResponse, servicesResponse] = await Promise.all([
            fetch(`${API_BASE}/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/admin/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/services`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        if (usersResponse.ok && ordersResponse.ok && servicesResponse.ok) {
            const users = await usersResponse.json();
            const orders = await ordersResponse.json();
            const services = await servicesResponse.json();
            
            // تحديث الإحصائيات
            document.getElementById('totalUsers').textContent = users.length;
            document.getElementById('totalOrders').textContent = orders.length;
            document.getElementById('totalServices').textContent = services.length;
            document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'pending').length;
            
            // عرض آخر الطلبات
            displayRecentOrders(orders.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading admin overview:', error);
    }
}

// عرض آخر الطلبات
function displayRecentOrders(orders) {
    const table = document.getElementById('recentOrdersTable');
    if (!table) return;
    
    table.innerHTML = '';
    
    orders.forEach(order => {
        const statusClass = getStatusClass(order.status);
        const row = `
            <tr>
                <td>${order.userId.username}</td>
                <td>${order.serviceId.name}</td>
                <td>${order.quantity}</td>
                <td><span class="${statusClass}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="updateOrderStatus('${order._id}', 'completed')">
                        <i class="fas fa-check"></i>
                    </button>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// تحميل طلبات المشرف
async function loadAdminOrders() {
    try {
        const response = await fetch(`${API_BASE}/admin/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const orders = await response.json();
            displayAdminOrders(orders);
        }
    } catch (error) {
        console.error('Error loading admin orders:', error);
    }
}

// عرض طلبات المشرف
function displayAdminOrders(orders) {
    const table = document.getElementById('adminOrdersTable');
    if (!table) return;
    
    table.innerHTML = '';
    
    orders.forEach(order => {
        const statusClass = getStatusClass(order.status);
        const row = `
            <tr>
                <td>${order.userId.username}</td>
                <td>${order.serviceId.name}</td>
                <td>${order.quantity}</td>
                <td>${order.totalPrice.toFixed(2)} $</td>
                <td><span class="${statusClass}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>
                    <select class="form-select form-select-sm" onchange="updateOrderStatus('${order._id}', this.value)">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>قيد المعالجة</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>مكتمل</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغى</option>
                    </select>
                </td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// تحديث حالة الطلب
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showAlert('تم تحديث حالة الطلب بنجاح', 'success');
            loadAdminData();
        } else {
            showAlert('خطأ في تحديث حالة الطلب', 'danger');
        }
    } catch (error) {
        showAlert('خطأ في الاتصال بالخادم', 'danger');
    }
}

// تحميل المستخدمين
async function loadAdminUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const users = await response.json();
            displayAdminUsers(users);
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

// عرض المستخدمين
function displayAdminUsers(users) {
    const table = document.getElementById('usersTable');
    if (!table) return;
    
    table.innerHTML = '';
    
    users.forEach(user => {
        const row = `
            <tr>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.balance.toFixed(2)} $</td>
                <td><span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// تحميل خدمات المشرف
async function loadAdminServices() {
    try {
        const response = await fetch(`${API_BASE}/services`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const services = await response.json();
            displayAdminServices(services);
        }
    } catch (error) {
        console.error('Error loading admin services:', error);
    }
}

// عرض خدمات المشرف
function displayAdminServices(services) {
    const container = document.getElementById('adminServicesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    services.forEach(service => {
        const card = `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card service-card">
                    <div class="card-body">
                        <h5 class="card-title">${service.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${service.platform}</h6>
                        <p class="card-text">${service.description || 'لا يوجد وصف'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="service-price">${service.price.toFixed(2)} $</span>
                            <span class="badge ${service.active ? 'bg-success' : 'bg-danger'}">
                                ${service.active ? 'نشط' : 'غير نشط'}
                            </span>
                        </div>
                        <small class="text-muted">الحد الأدنى: ${service.minOrder} - الحد الأقصى: ${service.maxOrder}</small>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// إعداد أحداث المشرف
function setupAdminEvents() {
    // إضافة خدمة
    const addServiceForm = document.getElementById('addServiceForm');
    if (addServiceForm) {
        addServiceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const serviceData = {
                name: document.getElementById('serviceName').value,
                platform: document.getElementById('servicePlatform').value,
                description: document.getElementById('serviceDescription').value,
                price: parseFloat(document.getElementById('servicePrice').value),
                minOrder: parseInt(document.getElementById('minOrder').value),
                maxOrder: parseInt(document.getElementById('maxOrder').value)
            };
            
            try {
                const response = await fetch(`${API_BASE}/services`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(serviceData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert('تم إضافة الخدمة بنجاح', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
                    addServiceForm.reset();
                    loadAdminServices();
                } else {
                    showAlert(data.message, 'danger');
                }
            } catch (error) {
                showAlert('خطأ في الاتصال بالخادم', 'danger');
            }
        });
    }
    
    // تسجيل خروج المشرف
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', logout);
    }
}

// الملف الشخصي
function initializeProfile() {
    if (!currentUser) return;
    
    loadProfileData();
    setupProfileEvents();
}

// تحميل بيانات الملف الشخصي
function loadProfileData() {
    // تحديث المعلومات الأساسية
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileBalance').textContent = `${currentUser.balance.toFixed(2)} $`;
    document.getElementById('profileUsernameInput').value = currentUser.username;
    document.getElementById('profileEmailInput').value = currentUser.email;
    document.getElementById('joinDate').value = new Date().toLocaleDateString('ar-EG');
    
    // تحميل إحصائيات الملف الشخصي
    loadProfileStatistics();
}

// تحميل إحصائيات الملف الشخصي
async function loadProfileStatistics() {
    try {
        const [ordersResponse, transactionsResponse] = await Promise.all([
            fetch(`${API_BASE}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);
        
        if (ordersResponse.ok && transactionsResponse.ok) {
            const orders = await ordersResponse.json();
            const transactions = await transactionsResponse.json();
            
            // تحديث الإحصائيات
            document.getElementById('totalOrdersCount').textContent = orders.length;
            document.getElementById('completedOrdersCount').textContent = orders.filter(o => o.status === 'completed').length;
            
            const totalSpent = transactions
                .filter(t => t.type === 'order')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            document.getElementById('totalSpent').textContent = `${totalSpent.toFixed(2)} $`;
            
            // عرض آخر الطلبات
            displayProfileOrders(orders.slice(0, 5));
        }
    } catch (error) {
        console.error('Error loading profile statistics:', error);
    }
}

// عرض طلبات الملف الشخصي
function displayProfileOrders(orders) {
    const table = document.getElementById('profileOrdersTable');
    if (!table) return;
    
    table.innerHTML = '';
    
    orders.forEach(order => {
        const statusClass = getStatusClass(order.status);
        const row = `
            <tr>
                <td>${order.serviceId.name}</td>
                <td><span class="${statusClass}">${getStatusText(order.status)}</span></td>
                <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>
        `;
        table.innerHTML += row;
    });
}

// إعداد أحداث الملف الشخصي
function setupProfileEvents() {
    // تغيير كلمة المرور
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            if (newPassword !== confirmNewPassword) {
                showAlert('كلمات المرور الجديدة غير متطابقة', 'danger');
                return;
            }
            
            // هنا يمكنك إضافة API لتغيير كلمة المرور
            showAlert('سيتم إضافة هذه الميزة قريباً', 'info');
            changePasswordForm.reset();
        });
    }
    
    // تسجيل خروج الملف الشخصي
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', logout);
    }
}

// تمكين تعديل الملف الشخصي
function enableEdit() {
    const usernameInput = document.getElementById('profileUsernameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const saveBtn = document.getElementById('saveProfileBtn');
    
    usernameInput.readOnly = false;
    emailInput.readOnly = false;
    saveBtn.style.display = 'inline-block';
}

// دوال مساعدة
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function getStatusClass(status) {
    const statusClasses = {
        'pending': 'status-pending',
        'processing': 'status-processing',
        'completed': 'status-completed',
        'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || 'status-pending';
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'قيد الانتظار',
        'processing': 'قيد المعالجة',
        'completed': 'مكتمل',
        'cancelled': 'ملغى'
    };
    return statusTexts[status] || 'قيد الانتظار';
}

function getTransactionTypeText(type) {
    const typeTexts = {
        'deposit': 'شحن رصيد',
        'withdrawal': 'سحب رصيد',
        'order': 'طلب خدمة'
    };
    return typeTexts[type] || type;
}

function showSection(sectionName) {
    // إخفاء جميع الأقسام
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // إظهار القسم المطلوب
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // تحديث القائمة النشطة
    const menuItems = document.querySelectorAll('.list-group-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(getSectionDisplayName(sectionName))) {
            item.classList.add('active');
        }
    });
}

function showAdminSection(sectionName) {
    // إخفاء جميع الأقسام
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // إظهار القسم المطلوب
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }
    
    // تحديث القائمة النشطة
    const menuItems = document.querySelectorAll('.list-group-item');
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.textContent.includes(getAdminSectionDisplayName(sectionName))) {
            item.classList.add('active');
        }
    });
}

function getSectionDisplayName(sectionName) {
    const names = {
        'services': 'الخدمات المتاحة',
        'orders': 'طلباتي',
        'transactions': 'المعاملات'
    };
    return names[sectionName] || sectionName;
}

function getAdminSectionDisplayName(sectionName) {
    const names = {
        'overview': 'نظرة عامة',
        'orders': 'إدارة الطلبات',
        'users': 'إدارة المستخدمين',
        'services': 'إدارة الخدمات'
    };
    return names[sectionName] || sectionName;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = 'index.html';
}
