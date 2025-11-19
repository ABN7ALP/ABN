// الدوال العامة
class SMMSystem {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadServices();
        this.animateStats();
    }

    // التحقق من المصادقة
    checkAuth() {
        if (this.token && this.user) {
            this.updateAuthUI();
        }
    }

    // تحديث واجهة المصادقة
    updateAuthUI() {
        const authLinks = document.querySelector('.navbar-nav:last-child');
        if (authLinks && this.user) {
            authLinks.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user"></i> ${this.user.username}
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="/dashboard">لوحة التحكم</a></li>
                        <li><a class="dropdown-item" href="/profile">الملف الشخصي</a></li>
                        ${this.user.role === 'admin' ? '<li><a class="dropdown-item" href="/admin">لوحة الأدمن</a></li>' : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" onclick="smmSystem.logout()">تسجيل الخروج</a></li>
                    </ul>
                </li>
            `;
        }
    }

    // تسجيل الخروج
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }

    // تحميل الخدمات
    async loadServices() {
        try {
            const response = await fetch('/api/services');
            const services = await response.json();
            this.displayServices(services);
        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    // عرض الخدمات
    displayServices(services) {
        const container = document.getElementById('servicesList');
        if (!container) return;

        container.innerHTML = services.map(service => `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="service-card card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${service.name}</h5>
                        <p class="card-text text-muted">${service.description}</p>
                        <div class="service-details">
                            <div class="mb-2">
                                <strong>السعر:</strong> $${service.price} لكل 1000
                            </div>
                            <div class="mb-2">
                                <strong>الحد الأدنى:</strong> ${service.minOrder}
                            </div>
                            <div class="mb-3">
                                <strong>السرعة:</strong> ${service.speed}
                            </div>
                        </div>
                        ${this.token ? `
                            <button class="btn btn-primary w-100" onclick="smmSystem.orderService('${service._id}')">
                                <i class="fas fa-shopping-cart"></i> طلب الخدمة
                            </button>
                        ` : `
                            <a href="/login" class="btn btn-outline-primary w-100">
                                <i class="fas fa-sign-in-alt"></i> سجل الدخول للطلب
                            </a>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // طلب خدمة
    async orderService(serviceId) {
        if (!this.token) {
            window.location.href = '/login';
            return;
        }

        const link = prompt('أدخل الرابط:', 'https://');
        if (!link) return;

        const quantity = prompt('أدخل الكمية:', '1000');
        if (!quantity || isNaN(quantity)) {
            alert('الكمية يجب أن تكون رقماً');
            return;
        }

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    serviceId,
                    link,
                    quantity: parseInt(quantity)
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('تم إنشاء الطلب بنجاح!');
                // إرسال الطلب إلى الواتساب (يمكن إضافة هذه الميزة لاحقاً)
                this.sendToWhatsApp(result.order);
            } else {
                alert(result.error || 'حدث خطأ أثناء إنشاء الطلب');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            alert('حدث خطأ في الاتصال');
        }
    }

    // إرسال إلى الواتساب
    sendToWhatsApp(order) {
        // هنا يمكنك إضافة كود لإرسال الطلب إلى الواتساب
        const message = `طلب جديد:
        رقم الطلب: ${order.orderId}
        الرابط: ${order.link}
        الكمية: ${order.quantity}
        السعر: $${order.price}`;
        
        console.log('إرسال إلى الواتساب:', message);
        // window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    // تحريك الإحصائيات
    animateStats() {
        const counters = document.querySelectorAll('.stat-number');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-count'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;

            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    current = target;
                    clearInterval(timer);
                }
                counter.textContent = Math.floor(current);
            }, 16);
        });
    }

    // تسجيل الدخول
    async login(email, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                this.token = result.token;
                this.user = result.user;
                return { success: true, user: result.user };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            return { success: false, error: 'خطأ في الاتصال' };
        }
    }

    // تسجيل حساب جديد
    async register(username, email, password) {
        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                this.token = result.token;
                this.user = result.user;
                return { success: true, user: result.user };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            return { success: false, error: 'خطأ في الاتصال' };
        }
    }
}

// إنشاء نسخة من النظام
const smmSystem = new SMMSystem();

// دوال خاصة بلوحة التحكم
class DashboardManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    async init() {
        if (!this.token || !this.user) {
            window.location.href = '/login';
            return;
        }

        await this.loadUserData();
        await this.loadOrders();
        await this.loadTransactions();
    }

    // تحميل بيانات المستخدم
    async loadUserData() {
        try {
            const response = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const user = await response.json();
            this.updateUserInfo(user);
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // تحديث معلومات المستخدم في الواجهة
    updateUserInfo(user) {
        const balanceElement = document.getElementById('userBalance');
        const usernameElement = document.getElementById('userUsername');
        
        if (balanceElement) balanceElement.textContent = user.balance.toFixed(2);
        if (usernameElement) usernameElement.textContent = user.username;
    }

    // تحميل الطلبات
    async loadOrders() {
        try {
            const response = await fetch('/api/orders', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const orders = await response.json();
            this.displayOrders(orders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    // عرض الطلبات
    displayOrders(orders) {
        const container = document.getElementById('ordersList');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">لا توجد طلبات</td></tr>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <tr>
                <td>${order.orderId}</td>
                <td>${order.serviceId.name}</td>
                <td>${order.link}</td>
                <td>${order.quantity}</td>
                <td>$${order.price}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(order.status)}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
                <td>${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
            </tr>
        `).join('');
    }

    // تحميل المعاملات
    async loadTransactions() {
        try {
            const response = await fetch('/api/transactions', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const transactions = await response.json();
            this.displayTransactions(transactions);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    }

    // عرض المعاملات
    displayTransactions(transactions) {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = '<tr><td colspan="4" class="text-center">لا توجد معاملات</td></tr>';
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.amount > 0 ? 'text-success' : 'text-danger'}">
                    ${transaction.amount > 0 ? '+' : ''}$${transaction.amount}
                </td>
                <td>
                    <span class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">
                        ${transaction.status === 'completed' ? 'مكتمل' : 'معلق'}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // شحن الرصيد
    async deposit(amount) {
        if (!amount || amount <= 0) {
            alert('المبلغ يجب أن يكون أكبر من الصفر');
            return;
        }

        try {
            const response = await fetch('/api/deposit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ amount: parseFloat(amount) })
            });

            const result = await response.json();

            if (response.ok) {
                alert('تم شحن الرصيد بنجاح!');
                this.loadUserData();
                this.loadTransactions();
            } else {
                alert(result.error || 'حدث خطأ أثناء شحن الرصيد');
            }
        } catch (error) {
            console.error('Error depositing:', error);
            alert('حدث خطأ في الاتصال');
        }
    }

    // الحصول على لون الحالة
    getStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'in progress': 'info',
            'completed': 'success',
            'cancelled': 'danger'
        };
        return colors[status] || 'secondary';
    }

    // الحصول على نص الحالة
    getStatusText(status) {
        const texts = {
            'pending': 'قيد الانتظار',
            'in progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'cancelled': 'ملغي'
        };
        return texts[status] || status;
    }
}

// دوال خاصة بلوحة الأدمن
class AdminManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    async init() {
        if (!this.token || !this.user || this.user.role !== 'admin') {
            window.location.href = '/';
            return;
        }

        await this.loadStats();
        await this.loadAllOrders();
        await this.loadAllServices();
    }

    // تحميل الإحصائيات
    async loadStats() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const stats = await response.json();
            this.displayStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // عرض الإحصائيات
    displayStats(stats) {
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('totalOrders').textContent = stats.totalOrders;
        document.getElementById('totalRevenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
        
        this.displayRecentOrders(stats.recentOrders);
    }

    // عرض الطلبات الحديثة
    displayRecentOrders(orders) {
        const container = document.getElementById('recentOrders');
        if (!container) return;

        container.innerHTML = orders.map(order => `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${order.serviceId.name}</h6>
                    <small>$${order.price}</small>
                </div>
                <p class="mb-1">${order.link}</p>
                <small>بواسطة: ${order.userId.username} - ${new Date(order.createdAt).toLocaleDateString('ar-EG')}</small>
            </div>
        `).join('');
    }

    // تحميل جميع الطلبات
    async loadAllOrders() {
        // يمكن إضافة هذا لاحقاً
    }

    // تحميل جميع الخدمات
    async loadAllServices() {
        // يمكن إضافة هذا لاحقاً
    }

    // إضافة خدمة جديدة
    async addService(serviceData) {
        try {
            const response = await fetch('/api/services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(serviceData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('تم إضافة الخدمة بنجاح!');
                return true;
            } else {
                alert(result.error || 'حدث خطأ أثناء إضافة الخدمة');
                return false;
            }
        } catch (error) {
            console.error('Error adding service:', error);
            alert('حدث خطأ في الاتصال');
            return false;
        }
    }
}

// تصدير الكلاسات للاستخدام العالمي
window.smmSystem = smmSystem;
window.DashboardManager = DashboardManager;
window.AdminManager = AdminManager;
