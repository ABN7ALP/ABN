// النظام الرئيسي المتقدم
class SMMSystemPro {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.currentPlatform = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadPlatforms();
        this.setupEventListeners();
        this.animateElements();
    }

    // التحقق من المصادقة
    checkAuth() {
        if (this.token && this.user) {
            this.updateAuthUI();
            this.loadNotifications();
        }
    }

    // تحديث واجهة المصادقة
    updateAuthUI() {
        const authElements = document.querySelectorAll('.auth-element');
        authElements.forEach(element => {
            if (this.user) {
                if (element.classList.contains('user-info')) {
                    element.innerHTML = `
                        <div class="dropdown">
                            <button class="btn btn-link text-white dropdown-toggle d-flex align-items-center" 
                                    type="button" data-bs-toggle="dropdown">
                                <img src="${this.user.avatar}" alt="${this.user.username}" 
                                     class="user-avatar me-2">
                                <span>${this.user.username}</span>
                                ${this.getNotificationBadge()}
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <span class="dropdown-item-text">
                                        <small>الرصيد: $${this.user.balance?.toFixed(2) || '0.00'}</small>
                                    </span>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="/dashboard">
                                    <i class="fas fa-tachometer-alt me-2"></i>لوحة التحكم
                                </a></li>
                                <li><a class="dropdown-item" href="/profile">
                                    <i class="fas fa-user me-2"></i>الملف الشخصي
                                </a></li>
                                ${this.user.role === 'admin' ? 
                                '<li><a class="dropdown-item" href="/admin">' +
                                '<i class="fas fa-cogs me-2"></i>لوحة الأدمن</a></li>' : ''}
                                <li><a class="dropdown-item" href="/deposit">
                                    <i class="fas fa-wallet me-2"></i>شحن الرصيد
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="smmSystem.logout()">
                                    <i class="fas fa-sign-out-alt me-2"></i>تسجيل الخروج
                                </a></li>
                            </ul>
                        </div>
                    `;
                }
            } else {
                if (element.classList.contains('user-info')) {
                    element.innerHTML = `
                        <a href="/login" class="btn btn-outline-light me-2">
                            <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                        </a>
                        <a href="/register" class="btn btn-light">
                            <i class="fas fa-user-plus"></i> إنشاء حساب
                        </a>
                    `;
                }
            }
        });
    }

    // الحصول على شارة الإشعارات
    getNotificationBadge() {
        if (this.user.unreadNotifications > 0) {
            return `<span class="notification-badge">${this.user.unreadNotifications}</span>`;
        }
        return '';
    }

    // تحميل المنصات
    async loadPlatforms() {
        try {
            const response = await fetch('/api/services/platforms');
            const platforms = await response.json();
            this.displayPlatforms(platforms);
        } catch (error) {
            console.error('Error loading platforms:', error);
        }
    }

    // عرض المنصات
    displayPlatforms(platforms) {
        const container = document.getElementById('platformsGrid');
        if (!container) return;

        const platformData = {
            'instagram': { name: 'انستجرام', icon: 'fab fa-instagram', color: 'platform-instagram' },
            'youtube': { name: 'يوتيوب', icon: 'fab fa-youtube', color: 'platform-youtube' },
            'tiktok': { name: 'تيك توك', icon: 'fab fa-tiktok', color: 'platform-tiktok' },
            'twitter': { name: 'تويتر', icon: 'fab fa-twitter', color: 'platform-twitter' },
            'facebook': { name: 'فيسبوك', icon: 'fab fa-facebook', color: 'platform-facebook' },
            'telegram': { name: 'تيليجرام', icon: 'fab fa-telegram', color: 'platform-telegram' }
        };

        container.innerHTML = platforms.map(platform => {
            const data = platformData[platform] || { name: platform, icon: 'fas fa-globe', color: 'platform-instagram' };
            return `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="platform-card" onclick="smmSystem.selectPlatform('${platform}')">
                        <div class="platform-icon ${data.color}">
                            <i class="${data.icon}"></i>
                        </div>
                        <h4>${data.name}</h4>
                        <p>خدمات متقدمة لـ ${data.name} بجودة عالية وأسعار منافسة</p>
                        <button class="btn btn-outline-primary">
                            <i class="fas fa-arrow-left me-2"></i>عرض الخدمات
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // اختيار منصة
    selectPlatform(platform) {
        this.currentPlatform = platform;
        this.showServicesModal(platform);
    }

    // عرض نافذة الخدمات
    async showServicesModal(platform) {
        try {
            const response = await fetch(`/api/services?platform=${platform}`);
            const services = await response.json();
            
            const modal = new bootstrap.Modal(document.getElementById('servicesModal'));
            const modalBody = document.getElementById('servicesModalBody');
            
            modalBody.innerHTML = this.renderServicesList(services, platform);
            modal.show();
            
            // إضافة مستمعي الأحداث للنماذج
            this.setupServiceForms();
        } catch (error) {
            console.error('Error loading services:', error);
        }
    }

    // عرض قائمة الخدمات
    renderServicesList(services, platform) {
        if (services.length === 0) {
            return `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5>لا توجد خدمات متاحة</h5>
                    <p class="text-muted">سيتم إضافة خدمات لهذه المنصة قريباً</p>
                </div>
            `;
        }

        return `
            <div class="row">
                ${services.map(service => `
                    <div class="col-12 mb-3">
                        <div class="card service-item">
                            <div class="card-body">
                                <div class="row align-items-center">
                                    <div class="col-md-6">
                                        <h6 class="card-title mb-1">${service.name}</h6>
                                        <p class="card-text text-muted small mb-2">${service.description}</p>
                                        <div class="service-meta">
                                            <span class="badge platform-badge badge-${service.platform} me-2">
                                                ${this.getPlatformName(service.platform)}
                                            </span>
                                            <span class="badge bg-light text-dark me-2">
                                                <i class="fas fa-bolt me-1"></i>${service.speed}
                                            </span>
                                            <span class="badge bg-light text-dark">
                                                <i class="fas fa-star me-1"></i>${service.quality}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="col-md-3 text-center">
                                        <div class="service-price">
                                            <h5 class="text-primary mb-0">$${service.price}</h5>
                                            <small class="text-muted">لكل 1000</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <form class="service-order-form" data-service-id="${service._id}">
                                            <div class="mb-2">
                                                <input type="url" class="form-control form-control-sm" 
                                                       placeholder="أدخل الرابط" required>
                                            </div>
                                            <div class="input-group input-group-sm mb-2">
                                                <input type="number" class="form-control" 
                                                       placeholder="الكمية" 
                                                       min="${service.minOrder}" 
                                                       max="${service.maxOrder}" 
                                                       value="${service.minOrder}" 
                                                       required>
                                                <span class="input-group-text">عدد</span>
                                            </div>
                                            <button type="submit" class="btn btn-primary btn-sm w-100">
                                                <i class="fas fa-shopping-cart me-1"></i>طلب الآن
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // الحصول على اسم المنصة
    getPlatformName(platform) {
        const names = {
            'instagram': 'انستجرام',
            'youtube': 'يوتيوب',
            'tiktok': 'تيك توك',
            'twitter': 'تويتر',
            'facebook': 'فيسبوك',
            'telegram': 'تيليجرام'
        };
        return names[platform] || platform;
    }

    // إعداد نماذج الخدمات
    setupServiceForms() {
        document.querySelectorAll('.service-order-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleServiceOrder(form);
            });

            // تحليل الرابط عند التغيير
            const linkInput = form.querySelector('input[type="url"]');
            linkInput.addEventListener('blur', () => {
                this.analyzeLink(linkInput.value, form);
            });

            // حساب السعر عند تغيير الكمية
            const quantityInput = form.querySelector('input[type="number"]');
            quantityInput.addEventListener('input', () => {
                this.calculatePrice(form);
            });
        });
    }

    // تحليل الرابط
    async analyzeLink(url, form) {
        if (!url || !validator.isURL(url)) return;

        const preview = form.closest('.card').querySelector('.link-preview');
        if (!preview) {
            const previewDiv = document.createElement('div');
            previewDiv.className = 'link-preview mt-3';
            form.closest('.card-body').appendChild(previewDiv);
        }

        const previewElement = form.closest('.card-body').querySelector('.link-preview');
        previewElement.innerHTML = `
            <div class="text-center">
                <div class="loading"></div>
                <small class="text-muted">جاري تحليل الرابط...</small>
            </div>
        `;

        try {
            // محاكاة تحليل الرابط (يمكن استبدالها بـ API حقيقي)
            setTimeout(() => {
                previewElement.innerHTML = `
                    <div class="preview-content">
                        <div class="preview-image" style="background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-link fa-2x text-muted"></i>
                        </div>
                        <div class="preview-title">رابط ${this.getPlatformName(this.currentPlatform)}</div>
                        <div class="preview-description">تم التحقق من صحة الرابط وجاهز للطلب</div>
                    </div>
                `;
            }, 1000);
        } catch (error) {
            previewElement.innerHTML = `
                <div class="alert alert-warning py-2">
                    <small><i class="fas fa-exclamation-triangle me-1"></i>تعذر تحليل الرابط</small>
                </div>
            `;
        }
    }

    // حساب السعر
    calculatePrice(form) {
        const quantityInput = form.querySelector('input[type="number"]');
        const serviceId = form.dataset.serviceId;
        const quantity = parseInt(quantityInput.value);
        
        // في التطبيق الحقيقي، ستحتاج لجلب سعر الخدمة من السيرفر
        const pricePer1000 = 2.5; // سعر افتراضي
        const totalPrice = (pricePer1000 * quantity) / 1000;
        
        const button = form.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        button.innerHTML = `طلب بـ $${totalPrice.toFixed(2)}`;
        
        // إعادة النص الأصلي بعد ثانية
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }

    // معالجة طلب الخدمة
    async handleServiceOrder(form) {
        if (!this.token) {
            window.location.href = '/login';
            return;
        }

        const formData = new FormData(form);
        const link = form.querySelector('input[type="url"]').value;
        const quantity = form.querySelector('input[type="number"]').value;
        const serviceId = form.dataset.serviceId;

        if (!link || !quantity) {
            this.showAlert('يرجى ملء جميع الحقول', 'danger');
            return;
        }

        const button = form.querySelector('button[type="submit"]');
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading"></span> جاري إنشاء الطلب...';
        button.disabled = true;

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
                this.showAlert('تم إنشاء الطلب بنجاح!', 'success');
                // إغلاق النافذة بعد نجاح الطلب
                const modal = bootstrap.Modal.getInstance(document.getElementById('servicesModal'));
                modal.hide();
                
                // تحديث رصيد المستخدم
                if (this.user) {
                    this.user.balance = result.user?.balance || this.user.balance;
                    localStorage.setItem('user', JSON.stringify(this.user));
                    this.updateAuthUI();
                }
            } else {
                this.showAlert(result.error || 'حدث خطأ أثناء إنشاء الطلب', 'danger');
            }
        } catch (error) {
            console.error('Error creating order:', error);
            this.showAlert('حدث خطأ في الاتصال', 'danger');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    // تحميل الإشعارات
    async loadNotifications() {
        if (!this.token) return;

        try {
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            const notifications = await response.json();
            this.updateNotificationsUI(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // تحديث واجهة الإشعارات
    updateNotificationsUI(notifications) {
        const notificationsDropdown = document.getElementById('notificationsDropdown');
        if (!notificationsDropdown) return;

        if (notifications.length === 0) {
            notificationsDropdown.innerHTML = `
                <li><span class="dropdown-item-text text-muted">لا توجد إشعارات</span></li>
            `;
            return;
        }

        notificationsDropdown.innerHTML = notifications.slice(0, 5).map(notification => `
            <li>
                <a class="dropdown-item ${notification.read ? '' : 'fw-bold'}" href="#">
                    <div class="d-flex align-items-start">
                        <i class="fas fa-bell text-${notification.type} mt-1 me-2"></i>
                        <div>
                            <div class="small">${notification.title}</div>
                            <div class="text-muted small">${notification.message}</div>
                            <div class="text-muted smaller">${this.formatTime(notification.createdAt)}</div>
                        </div>
                    </div>
                </a>
            </li>
        `).join('') + `
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-center small" href="/dashboard#notifications">
                عرض جميع الإشعارات
            </a></li>
        `;
    }

    // تنسيق الوقت
    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `قبل ${minutes} دقيقة`;
        if (hours < 24) return `قبل ${hours} ساعة`;
        if (days < 7) return `قبل ${days} يوم`;
        
        return date.toLocaleDateString('ar-EG');
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // البحث في الخدمات
        const searchInput = document.getElementById('servicesSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.searchServices(searchInput.value);
            }, 300));
        }

        // تصفية المنصات
        const platformFilter = document.getElementById('platformFilter');
        if (platformFilter) {
            platformFilter.addEventListener('change', () => {
                this.filterByPlatform(platformFilter.value);
            });
        }
    }

    // بحث الخدمات
    async searchServices(query) {
        try {
            const response = await fetch(`/api/services?search=${encodeURIComponent(query)}`);
            const services = await response.json();
            this.displaySearchResults(services);
        } catch (error) {
            console.error('Error searching services:', error);
        }
    }

    // عرض نتائج البحث
    displaySearchResults(services) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (services.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-search fa-2x text-muted mb-3"></i>
                    <h5>لا توجد نتائج</h5>
                    <p class="text-muted">جرب استخدام كلمات بحث أخرى</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = services.map(service => `
            <div class="col-12 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${service.name}</h6>
                        <p class="card-text text-muted">${service.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge platform-badge badge-${service.platform}">
                                ${this.getPlatformName(service.platform)}
                            </span>
                            <span class="text-primary fw-bold">$${service.price}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // تصفية حسب المنصة
    async filterByPlatform(platform) {
        if (!platform) {
            this.loadPlatforms();
            return;
        }

        try {
            const response = await fetch(`/api/services?platform=${platform}`);
            const services = await response.json();
            this.displayFilteredResults(services, platform);
        } catch (error) {
            console.error('Error filtering services:', error);
        }
    }

    // عرض النتائج المصفاة
    displayFilteredResults(services, platform) {
        const platformsGrid = document.getElementById('platformsGrid');
        if (!platformsGrid) return;

        const platformData = this.getPlatformData(platform);
        platformsGrid.innerHTML = `
            <div class="col-12">
                <div class="platform-card">
                    <div class="platform-icon ${platformData.color}">
                        <i class="${platformData.icon}"></i>
                    </div>
                    <h4>${platformData.name}</h4>
                    <p>عرض ${services.length} خدمة لـ ${platformData.name}</p>
                    <div class="services-list mt-4">
                        ${services.map(service => `
                            <div class="service-item border-bottom pb-3 mb-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">${service.name}</h6>
                                        <p class="text-muted small mb-0">${service.description}</p>
                                    </div>
                                    <div class="text-end">
                                        <div class="text-primary fw-bold">$${service.price}</div>
                                        <small class="text-muted">لكل 1000</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="btn btn-outline-primary mt-3" onclick="smmSystem.showServicesModal('${platform}')">
                        <i class="fas fa-shopping-cart me-2"></i>طلب الخدمات
                    </button>
                </div>
            </div>
        `;
    }

    // الحصول على بيانات المنصة
    getPlatformData(platform) {
        const platforms = {
            'instagram': { name: 'انستجرام', icon: 'fab fa-instagram', color: 'platform-instagram' },
            'youtube': { name: 'يوتيوب', icon: 'fab fa-youtube', color: 'platform-youtube' },
            'tiktok': { name: 'تيك توك', icon: 'fab fa-tiktok', color: 'platform-tiktok' },
            'twitter': { name: 'تويتر', icon: 'fab fa-twitter', color: 'platform-twitter' },
            'facebook': { name: 'فيسبوك', icon: 'fab fa-facebook', color: 'platform-facebook' },
            'telegram': { name: 'تيليجرام', icon: 'fab fa-telegram', color: 'platform-telegram' }
        };
        return platforms[platform] || { name: platform, icon: 'fas fa-globe', color: 'platform-instagram' };
    }

    // إظهار تنبيه
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('.alert-container') || document.body;
        container.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // تحريك العناصر
    animateElements() {
        // إضافة تأثيرات للبطاقات عند التمرير
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        });

        document.querySelectorAll('.platform-card, .feature-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'all 0.6s ease';
            observer.observe(card);
        });
    }

    // منع التكرار
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
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

    // تسجيل الخروج
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        window.location.href = '/';
    }
}

// نظام إدارة لوحة التحكم
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
        await this.loadNotifications();
    }

    // تحميل بيانات المستخدم
    async loadUserData() {
        try {
            const response = await fetch('/api/user/profile', {
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

    // تحديث معلومات المستخدم
    updateUserInfo(user) {
        document.getElementById('userBalance').textContent = user.balance.toFixed(2);
        document.getElementById('userUsername').textContent = user.username;
        document.getElementById('userAvatar').src = user.avatar;
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
            container.innerHTML = '<tr><td colspan="7" class="text-center py-4">لا توجد طلبات</td></tr>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <tr>
                <td>${order.orderId}</td>
                <td>
                    <span class="badge platform-badge badge-${order.serviceId.platform}">
                        ${smmSystem.getPlatformName(order.serviceId.platform)}
                    </span>
                </td>
                <td>${order.serviceId.name}</td>
                <td>
                    <a href="${order.link}" target="_blank" class="text-truncate d-inline-block" style="max-width: 150px;">
                        ${order.link}
                    </a>
                </td>
                <td>${order.quantity}</td>
                <td>$${order.price}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(order.status)}">
                        ${this.getStatusText(order.status)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // الحصول على لون الحالة
    getStatusColor(status) {
        const colors = {
            'pending': 'warning',
            'in progress': 'info',
            'completed': 'success',
            'partial': 'primary',
            'cancelled': 'danger',
            'refunded': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    // الحصول على نص الحالة
    getStatusText(status) {
        const texts = {
            'pending': 'قيد الانتظار',
            'in progress': 'قيد التنفيذ',
            'completed': 'مكتمل',
            'partial': 'جزئي',
            'cancelled': 'ملغي',
            'refunded': 'مسترد'
        };
        return texts[status] || status;
    }
}

// إنشاء نسخة من النظام
const smmSystem = new SMMSystemPro();

// تصدير الكلاسات
window.smmSystem = smmSystem;
window.DashboardManager = DashboardManager;
