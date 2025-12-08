document.addEventListener('DOMContentLoaded', () => {
    // --- 0. تفعيل وضع سطح المكتب على الهواتف ---
    function suggestDesktopView() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            console.log('📱 تم الكشف عن جهاز محمول - تفعيل عرض سطح المكتب');
            
            // إضافة CSS بسيط لتحسين العرض
            const style = document.createElement('style');
            style.textContent = `
                /* تحسين العرض على الهواتف مع عرض سطح المكتب */
                body {
                    min-width: 100%;
                }
                .container {
                    width: 100%;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                /* تحسين عرض البطاقات */
                .services-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                
                /* تحسين الهيدر */
                .main-header .container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // تشغيل الدالة
    suggestDesktopView();

    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- المتغيرات العامة ---
    let servicesData = {}, currentPlatform = null, userInfo = null, currentOrderData = {};
    // في app.js - أضف في الأعلى مع المتغيرات
   let priceUpdateTimeout = null;


// دالة مساعدة لحساب السعر مع الخصم - محسنة
async function calculatePriceWithDiscount(serviceName, platform, quantity, userId = null) {
    // 🆕 إذا كانت الكمية غير صالحة، إرجاع سعر صفر
    if (isNaN(quantity) || quantity <= 0) {
        return { originalPrice: 0, finalPrice: 0, discount: 0, hasDiscount: false };
    }

    try {
        const response = await apiFetch('/api/orders/calculate-price', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceName, platform, quantity, userId })
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            throw new Error('فشل حساب السعر');
        }
    } catch (error) {
        console.error('Error calculating discount:', error);
        // 🆕 Fallback أسرع إذا فشل الحساب
        const service = servicesData[platform]?.services.find(s => s.name === serviceName);
        if (!service) return { originalPrice: 0, finalPrice: 0, discount: 0, hasDiscount: false };
        
        const pricePerUnit = service.pricePer1000 / 1000;
        const originalPrice = pricePerUnit * quantity;
        return {
            originalPrice: parseFloat(originalPrice.toFixed(4)),
            finalPrice: parseFloat(originalPrice.toFixed(4)),
            discount: 0,
            hasDiscount: false
        };
    }
}
    
// 🆕 🔽 أضف هنا - دوال قوة كلمة المرور 🔽
// دالة التحقق من قوة كلمة المرور
function checkPasswordStrength(password) {
    let strength = 0;
    const feedback = [];
    
    // التحقق من الطول
    if (password.length >= 8) strength++;
    else feedback.push('8 أحرف على الأقل');
    
    // التحقق من الأحرف الصغيرة
    if (/[a-z]/.test(password)) strength++;
    else feedback.push('حرف صغير (a-z)');
    
    // التحقق من الأحرف الكبيرة  
    if (/[A-Z]/.test(password)) strength++;
    else feedback.push('حرف كبير (A-Z)');
    
    // التحقق من الأرقام
    if (/[0-9]/.test(password)) strength++;
    else feedback.push('رقم (0-9)');
    
    // التحقق من الرموز الخاصة
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    else feedback.push('رمز خاص (!@#$...)');
    
    return { strength, feedback };
}

// دالة تحديث عرض قوة كلمة المرور
function updatePasswordStrength(password) {
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.getElementById('password-strength-text');
    
    if (!password) {
        strengthBars.forEach(bar => bar.style.background = '#e2e8f0');
        strengthText.textContent = '';
        return;
    }
    
    const { strength, feedback } = checkPasswordStrength(password);
    
    // تحديث الألوان
    strengthBars.forEach((bar, index) => {
        if (index < strength) {
            if (strength <= 2) bar.style.background = '#ef4444';
            else if (strength <= 4) bar.style.background = '#f59e0b';
            else bar.style.background = '#10b981';
        } else {
            bar.style.background = '#e2e8f0';
        }
    });
    
    // تحديث النص
    const strengthLabels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية جداً'];
    strengthText.textContent = `${strengthLabels[strength - 1] || 'ضعيفة'}${feedback.length ? ` - يحتاج: ${feedback.join(', ')}` : ''}`;
    strengthText.style.color = strength <= 2 ? '#ef4444' : strength <= 4 ? '#f59e0b' : '#10b981';
}
// 🆕 🔼 نهاية إضافة دوال قوة كلمة المرور 🔼

    // 🆕 🔽 أضف هذه الدالة بعد دوال قوة كلمة المرور 🔽

// دالة تحويل الملف إلى Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// 🔼 نهاية إضافة الدالة 🔼

    // --- عناصر الصفحة ---
    const servicesContainer = document.getElementById('services-container');
    const orderPopupOverlay = document.getElementById('order-popup-overlay');
    const closePopupButton = document.getElementById('close-popup-btn');
    const successOkButton = document.getElementById('success-ok-btn');
    const orderFormContainer = document.getElementById('order-form-container');
    const successMessageContainer = document.getElementById('success-message-container');
    const formTitle = document.getElementById('form-title');
    const popupIcon = document.getElementById('popup-icon');
    const serviceSelect = document.getElementById('service-select');
    const linkInput = document.getElementById('link-input');
    const linkError = document.getElementById('link-error');
    const quantityInput = document.getElementById('quantity-input');
    const quantityError = document.getElementById('quantity-error');
    const priceDisplay = document.getElementById('price-display');
    const orderForm = document.getElementById('order-form');
    const formResponse = document.getElementById('form-response');
    const mainNav = document.getElementById('main-nav');
    const authPopupOverlay = document.getElementById('auth-popup-overlay');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginFormPopup = document.getElementById('login-form-popup');
    const registerFormPopup = document.getElementById('register-form-popup');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const loginPopupError = document.getElementById('login-popup-error');
    const registerPopupError = document.getElementById('register-popup-error');
    const depositPopupOverlay = document.getElementById('deposit-popup-overlay');
    const closeDepositPopupBtn = document.getElementById('close-deposit-popup-btn');
    const depositForm = document.getElementById('deposit-form');
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    const paymentDetailsContainer = document.getElementById('payment-details-container');
    const depositFormResponse = document.getElementById('deposit-form-response');
    const paymentOptionsContainer = document.getElementById('payment-options-container');
    const finalPriceDisplay = document.getElementById('final-price-display');
    const payWithBalanceBtn = document.getElementById('pay-with-balance-btn');
    const payWithWhatsappBtn = document.getElementById('pay-with-whatsapp-btn');
    const balanceError = document.getElementById('balance-error');
    const notificationBellContainer = document.getElementById('notification-bell-container');

    // --- 2. نظام المصادقة والقائمة المنسدلة ---
    function updateUIForAuth() {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
        userInfo = JSON.parse(storedUser);

        // 1. إنشاء جرس الإشعارات
        notificationBellContainer.innerHTML = `
            <div class="notification-bell">
                <i class="ph-bold ph-bell"></i>
                <span id="notification-count" class="notification-count">0</span>
                <div id="notifications-dropdown" class="notifications-dropdown">
                    <div class="notifications-header">
                        <h4>الإشعارات</h4>
                        <button id="mark-all-read-btn" class="mark-all-read-btn">تحديد الكل كمقروء</button>
                    </div>
                    <ul id="notifications-list" class="notifications-list">
                        <li class="no-notifications">لا توجد إشعارات جديدة.</li>
                    </ul>
                </div>
            </div>
        `;

        // 2. إنشاء قائمة المستخدم
        const profileImageHTML = userInfo.profileImage 
           ? `<img src="${userInfo.profileImage}" alt="${userInfo.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--purple-main);">`
           : `<i class="ph-bold ph-user-circle" style="font-size: 1.5rem; color: var(--purple-main);"></i>`;
        
        mainNav.innerHTML = `
            <div class="user-dropdown">
                <div class="user-dropdown-toggle">
                    ${profileImageHTML} <!-- 🆕 هنا التصحيح -->
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
                    <a href="#" id="add-balance-link"><i class="ph-bold ph-plus-circle"></i> شحن الرصيد</a>
                    <a href="my-orders.html"><i class="ph-bold ph-list-checks"></i> طلباتي</a>
                    <button id="logout-btn" class="logout-link"><i class="ph-bold ph-sign-out"></i> تسجيل الخروج</button>
                </div>
            </div>
        `;
            // 3. ربط الأحداث الخاصة بالقوائم المنسدلة
            document.querySelector('.user-dropdown-toggle').addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelector('.user-dropdown').classList.toggle('active');
                document.querySelector('.notification-bell').classList.remove('active');
            });

            const bellIcon = document.querySelector('.notification-bell .ph-bell');
            if (bellIcon) {
                bellIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const bell = document.querySelector('.notification-bell');
                    bell.classList.toggle('active');
                    document.querySelector('.user-dropdown').classList.remove('active');
                    if (bell.classList.contains('active')) {
                        markNotificationsAsRead();
                    }
                });
            }
            
            const markAllReadBtn = document.getElementById('mark-all-read-btn');
            if(markAllReadBtn) {
                markAllReadBtn.addEventListener('click', markNotificationsAsRead);
            }

            document.getElementById('logout-btn').addEventListener('click', logoutHandler);
            document.getElementById('add-balance-link').addEventListener('click', (e) => {
                e.preventDefault();
                showDepositPopup();
                document.querySelector('.user-dropdown').classList.remove('active');
            });

            fetchNotifications();

        } else {
            userInfo = null;
            notificationBellContainer.innerHTML = '';
            mainNav.innerHTML = `
                <button id="login-btn" class="pill-button secondary-button">تسجيل الدخول</button>
                <button id="register-btn" class="pill-button primary-button">إنشاء حساب</button>
            `;
            document.getElementById('login-btn').addEventListener('click', () => showAuthPopup('login'));
            document.getElementById('register-btn').addEventListener('click', () => showAuthPopup('register'));
            
            // 🆕 أضف event listener لنسيت كلمة المرور
            const forgotPasswordLink = document.getElementById('forgot-password-link');
            if (forgotPasswordLink) {
                forgotPasswordLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    showForgotPasswordPopup();
                });
            }
        }
    }

    function showAuthPopup(formType) {
    loginPopupError.textContent = '';
    registerPopupError.textContent = '';
    loginFormContainer.classList.toggle('hidden', formType !== 'login');
    registerFormContainer.classList.toggle('hidden', formType !== 'register');
    authPopupOverlay.classList.remove('hidden');
    
    // 🆕 إعادة إعداد event listeners عند فتح نافذة التسجيل
    if (formType === 'register') {
        setTimeout(() => {
            handleImageSelection();
            setupPasswordStrength();
        }, 100);
    }
}
    
// 🆕 🔽 أضف هذه الدالة هنا 🔽
function hideAuthPopup() { 
    authPopupOverlay.classList.add('hidden'); 
}
// 🔼 نهاية الإضافة 🔼
    
// 🆕 دالة إعداد قوة كلمة المرور
function setupPasswordStrength() {
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        // إزالة الـ listener القديم أولاً
        passwordInput.removeEventListener('input', updatePasswordStrength);
        passwordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
        console.log('✅ تم إعداد قوة كلمة المرور');
    }
}

    async function loginHandler(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;
        
        try {
            const response = await apiFetch('/api/auth/login', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ email, password, rememberMe }) 
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'فشل تسجيل الدخول');
                
            // تخزين التوكن والبيانات
            localStorage.setItem('token', data.token);
            localStorage.setItem('userInfo', JSON.stringify(data));
            userInfo = data; 
                
            hideAuthPopup();
            updateUIForAuth();

            // التوجيه بناءً على الصلاحيات
            if (data.isAdmin === true) {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/my-orders.html';
            }

        } catch (error) { 
            loginPopupError.textContent = error.message; 
        }
    }
    
    

    // 🔽 استبدل الدالة الحالية بهذه الدالة المحدثة 🔽
async function registerHandler(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const profileImageInput = document.getElementById('register-profile-image');
    
    registerPopupError.textContent = '';

    // 🆕 التحقق من قوة كلمة المرور
    const { strength } = checkPasswordStrength(password);
    if (strength < 3) {
        registerPopupError.textContent = 'كلمة المرور ضعيفة. يرجى اختيار كلمة مرور أقوى.';
        return;
    }
    
    try {
        let profileImageBase64 = null;
        
        // 🆕 معالجة الصورة إذا تم اختيارها
        if (profileImageInput && profileImageInput.files[0]) {
            profileImageBase64 = await fileToBase64(profileImageInput.files[0]);
        }
        
        const response = await apiFetch('/api/auth/register', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                username, 
                email, 
                password,
                profileImage: profileImageBase64 // 🆕 إرسال الصورة
            }) 
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'فشل إنشاء الحساب');
        }
        
        if (data.requiresVerification) {
            showVerificationPopup(data.email);
        } else {
            localStorage.setItem('userInfo', JSON.stringify(data));
            hideAuthPopup();
            updateUIForAuth();
        }
        
    } catch (error) { 
        registerPopupError.textContent = error.message; 
    }
}
// 🔼 نهاية الاستبدال 🔼

    function showVerificationPopup(email) {
    const registerFormContainer = document.getElementById('register-form-container');
    if (!registerFormContainer) {
        console.error('❌ عنصر register-form-container غير موجود');
        return;
    }
    
    registerFormContainer.classList.add('hidden');
    
    const verificationHTML = `
        <div class="popup-header">
            <i class="ph-bold ph-envelope-simple"></i>
            <h2>التحقق من البريد الإلكتروني</h2>
        </div>
        <p style="text-align: center; margin-bottom: 1.5rem;">
            تم إرسال كود تحقق إلى: <strong id="user-email">${email}</strong>
        </p>
        <form id="verification-form">
            <div class="form-group">
                <label for="verification-code">كود التحقق (6 أرقام)</label>
                <input type="text" id="verification-code" maxlength="6" required 
                       pattern="[0-9]{6}" placeholder="123456">
            </div>
            <button type="submit" class="pill-button primary-button">تحقق</button>
            <button type="button" id="resend-code-btn" class="pill-button secondary-button" style="margin-top: 0.5rem;">
                إعادة إرسال الكود
            </button>
        </form>
        <p id="verification-error" class="error-message" style="text-align: center;"></p>
    `;
    
    registerFormContainer.innerHTML = verificationHTML;
    registerFormContainer.classList.remove('hidden');
    
    // 🆕 استخدام setTimeout لضمان تحميل DOM
    setTimeout(() => {
        const verificationForm = document.getElementById('verification-form');
        const resendBtn = document.getElementById('resend-code-btn');
        
        if (verificationForm) {
            // 🆕 إزالة أي event listeners سابقة أولاً
            verificationForm.replaceWith(verificationForm.cloneNode(true));
            document.getElementById('verification-form').addEventListener('submit', handleVerification);
        }
        
        if (resendBtn) {
            resendBtn.replaceWith(resendBtn.cloneNode(true));
            document.getElementById('resend-code-btn').addEventListener('click', () => resendVerificationCode(email));
        }
    }, 100);
}
    async function handleVerification(e) {
    e.preventDefault();
    
    try {
        // 🆕 البحث الآمن مع التحقق من الوجود
        const codeInput = document.getElementById('verification-code');
        const emailElement = document.getElementById('user-email');
        const errorElement = document.getElementById('verification-error');
        
        if (!codeInput || !emailElement || !errorElement) {
            console.error('❌ عناصر الواجهة غير موجودة:', {
                codeInput: !!codeInput,
                emailElement: !!emailElement,
                errorElement: !!errorElement
            });
            return;
        }
        
        const code = codeInput.value;
        const email = emailElement.textContent;
        
        // التحقق من صحة الكود
        if (!code || code.length !== 6) {
            errorElement.textContent = 'الرجاء إدخال كود مكون من 6 أرقام';
            return;
        }
        
        errorElement.textContent = 'جاري التحقق...';
        
        const response = await apiFetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'فشل التحقق');
        }
        
        // 🆕 رسالة النجاح
        showVerificationSuccess(data.message);
        
    } catch (error) {
        const errorElement = document.getElementById('verification-error');
        if (errorElement) {
            errorElement.textContent = error.message;
        } else {
            console.error('❌ خطأ في التحقق:', error.message);
            alert('خطأ: ' + error.message);
        }
    }
}
// 🆕 دالة جديدة لعرض رسالة النجاح
function showVerificationSuccess(message) {
    const registerFormContainer = document.getElementById('register-form-container');
    if (!registerFormContainer) return;
    
    registerFormContainer.innerHTML = `
        <div class="popup-header">
            <i class="ph-bold ph-check-circle success-icon"></i>
            <h2>تم التحقق بنجاح!</h2>
        </div>
        <p style="text-align: center; margin-bottom: 1.5rem;">
            ${message}
        </p>
        <button id="success-login-btn" class="pill-button primary-button">
            تسجيل الدخول
        </button>
    `;
    
    // إضافة event listener للزر الجديد
    const successBtn = document.getElementById('success-login-btn');
    if (successBtn) {
        successBtn.addEventListener('click', () => {
            hideAuthPopup();
            setTimeout(() => showAuthPopup('login'), 500);
        });
    } 
}

    async function resendVerificationCode(email) {
        const errorElement = document.getElementById('verification-error');
        errorElement.textContent = '';
        
        try {
            const response = await apiFetch('/api/auth/send-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'فشل إعادة الإرسال');
            }
            
            errorElement.textContent = '✅ ' + data.message;
            errorElement.style.color = 'green';
            
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.style.color = 'red';
        }
    }

    // 🆕 دالة نسيت كلمة المرور
    function showForgotPasswordPopup() {
        loginFormContainer.classList.add('hidden');
        
        const forgotPasswordHTML = `
            <div class="popup-header">
                <i class="ph-bold ph-key"></i>
                <h2>استعادة كلمة المرور</h2>
            </div>
            <p style="text-align: center; margin-bottom: 1.5rem;">
                أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
            </p>
            <form id="forgot-password-form">
                <div class="form-group">
                    <label for="forgot-email">البريد الإلكتروني</label>
                    <input type="email" id="forgot-email" required>
                </div>
                <button type="submit" class="pill-button primary-button">إرسال رابط التعيين</button>
                <button type="button" id="back-to-login-btn" class="pill-button secondary-button" style="margin-top: 0.5rem;">
                    العودة لتسجيل الدخول
                </button>
            </form>
            <p id="forgot-password-error" class="error-message" style="text-align: center;"></p>
        `;
        
        let forgotPasswordContainer = document.getElementById('forgot-password-container');
        if (!forgotPasswordContainer) {
            forgotPasswordContainer = document.createElement('div');
            forgotPasswordContainer.id = 'forgot-password-container';
            forgotPasswordContainer.className = 'popup-content';
            authPopupOverlay.appendChild(forgotPasswordContainer);
        }
        
        forgotPasswordContainer.innerHTML = forgotPasswordHTML;
        forgotPasswordContainer.classList.remove('hidden');
        
        document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPassword);
        document.getElementById('back-to-login-btn').addEventListener('click', () => {
            forgotPasswordContainer.classList.add('hidden');
            loginFormContainer.classList.remove('hidden');
        });
    }

    async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const errorElement = document.getElementById('forgot-password-error');
    
    errorElement.textContent = '';
    
    try {
        const response = await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'فشل إرسال رابط التعيين');
        }
        
        // 🆕 بدلاً من إظهار رسالة النجاح، انتقل مباشرة لواجهة إدخال الكود
        showResetPasswordPopup(email);
        
    } catch (error) {
        errorElement.textContent = error.message;
    }
}
    function logoutHandler() {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
        updateUIForAuth();
    }

    async function refreshUserData() {
        if (!userInfo || !userInfo._id) return;
        try {
            const response = await apiFetch(`/api/auth/me?userId=${userInfo._id}`);
            if (!response.ok) { 
                logoutHandler(); 
                return; 
            }
            const updatedUser = await response.json();
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));
            userInfo = updatedUser;
            updateUIForAuth();
        } catch (error) { 
            console.error('Failed to refresh user data:', error); 
        }
    }


// 🆕 دالة لعرض واجهة إدخال الكود وكلمة المرور الجديدة
function showResetPasswordPopup(email) {
    const forgotPasswordContainer = document.getElementById('forgot-password-container');
    forgotPasswordContainer.classList.add('hidden');
    
    const resetPasswordHTML = `
        <div class="popup-header">
            <i class="ph-bold ph-key"></i>
            <h2>إعادة تعيين كلمة المرور</h2>
        </div>
        <p style="text-align: center; margin-bottom: 1.5rem;">
            أدخل الكود الذي استلمته وكلمة المرور الجديدة
        </p>
        <form id="reset-password-form">
            <div class="form-group">
                <label for="reset-email">البريد الإلكتروني</label>
                <input type="email" id="reset-email" value="${email}" readonly>
            </div>
            <div class="form-group">
                <label for="reset-code">كود التحقق (6 أرقام)</label>
                <input type="text" id="reset-code" maxlength="6" required 
                       pattern="[0-9]{6}" placeholder="123456">
            </div>
            <div class="form-group">
                <label for="new-password">كلمة المرور الجديدة</label>
                <input type="password" id="new-password" required minlength="6">
            </div>
            <button type="submit" class="pill-button primary-button">تعيين كلمة المرور</button>
            <button type="button" id="back-to-forgot-btn" class="pill-button secondary-button" style="margin-top: 0.5rem;">
                العودة للخلف
            </button>
        </form>
        <p id="reset-password-error" class="error-message" style="text-align: center;"></p>
    `;
    
    let resetPasswordContainer = document.getElementById('reset-password-container');
    if (!resetPasswordContainer) {
        resetPasswordContainer = document.createElement('div');
        resetPasswordContainer.id = 'reset-password-container';
        resetPasswordContainer.className = 'popup-content';
        authPopupOverlay.appendChild(resetPasswordContainer);
    }
    
    resetPasswordContainer.innerHTML = resetPasswordHTML;
    resetPasswordContainer.classList.remove('hidden');
    
    document.getElementById('reset-password-form').addEventListener('submit', handleResetPassword);
    document.getElementById('back-to-forgot-btn').addEventListener('click', () => {
        resetPasswordContainer.classList.add('hidden');
        showForgotPasswordPopup();
    });
}

// 🆕 دالة معالجة إعادة تعيين كلمة المرور
// 🔽 استبدل الدالة الحالية بهذه الدالة المحدثة 🔽
async function handleResetPassword(e) {
    e.preventDefault();
    const email = document.getElementById('reset-email').value;
    const token = document.getElementById('reset-code').value;
    const newPassword = document.getElementById('new-password').value;
    const errorElement = document.getElementById('reset-password-error');
    
    errorElement.textContent = '';
    
    try {
        // 🆕 التحقق من قوة كلمة المرور الجديدة
        const { strength } = checkPasswordStrength(newPassword);
        if (strength < 3) {
            errorElement.textContent = 'كلمة المرور الجديدة ضعيفة. يرجى اختيار كلمة مرور أقوى.';
            return;
        }
        
        const response = await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, newPassword })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'فشل إعادة تعيين كلمة المرور');
        }
        
        const resetPasswordContainer = document.getElementById('reset-password-container');
        resetPasswordContainer.innerHTML = `
            <div class="popup-header">
                <i class="ph-bold ph-check-circle success-icon"></i>
                <h2>تم التعيين بنجاح!</h2>
            </div>
            <p style="text-align: center; margin-bottom: 1.5rem;">
                تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.
            </p>
            <button id="success-login-btn" class="pill-button primary-button">
                تسجيل الدخول
            </button>
        `;
        
        // 🆕 أضف event listener للزر الجديد
        document.getElementById('success-login-btn').addEventListener('click', () => {
            // إخفاء كل النوافذ
            authPopupOverlay.classList.add('hidden');
            resetPasswordContainer.classList.add('hidden');
            
            // إظهار نافذة تسجيل الدخول بعد نصف ثانية
            setTimeout(() => {
                authPopupOverlay.classList.remove('hidden');
                loginFormContainer.classList.remove('hidden');
                registerFormContainer.classList.add('hidden');
                
                // تنظيف الحقول
                document.getElementById('login-email').value = email; // تعبئة الإيميل تلقائياً
                document.getElementById('login-password').value = '';
                loginPopupError.textContent = '';
            }, 500);
        });
        
    } catch (error) {
        errorElement.textContent = error.message;
    }
}
// 🔼 نهاية الاستبدال 🔼
    
    // 🔽 استبدل دالة handleImageSelection بالكود التالي:

// دالة معالجة اختيار الصورة - محدثة
function handleImageSelection() {
    const chooseImageBtn = document.getElementById('choose-image-btn');
    const imageInput = document.getElementById('register-profile-image');
    const imagePreview = document.getElementById('profile-image-preview');
    
    console.log('🔍 عناصر الصورة:', { chooseImageBtn, imageInput, imagePreview });
    
    if (chooseImageBtn && imageInput) {
        // إزالة أي event listeners سابقة
        chooseImageBtn.replaceWith(chooseImageBtn.cloneNode(true));
        imageInput.replaceWith(imageInput.cloneNode(true));
        
        // الحصول على العناصر الجديدة
        const newChooseImageBtn = document.getElementById('choose-image-btn');
        const newImageInput = document.getElementById('register-profile-image');
        const newImagePreview = document.getElementById('profile-image-preview');
        
        // إضافة event listener للزر
        newChooseImageBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🎯 تم النقر على زر اختيار الصورة');
            newImageInput.click();
        });
        
        // إضافة event listener لحقل الملف
        newImageInput.addEventListener('change', function(e) {
            console.log('📁 تم اختيار ملف:', e.target.files[0]);
            const file = e.target.files[0];
            if (file) {
                // التحقق من نوع الملف
                if (!file.type.startsWith('image/')) {
                    alert('⚠️ يرجى اختيار ملف صورة فقط');
                    return;
                }
                
                // التحقق من حجم الملف (2MB كحد أقصى)
                if (file.size > 2 * 1024 * 1024) {
                    alert('📏 حجم الصورة كبير جداً. الحد الأقصى 2MB');
                    return;
                }
                
                // عرض المعاينة
                const reader = new FileReader();
                reader.onload = function(e) {
                    console.log('🖼️ تم تحميل الصورة للعرض');
                    newImagePreview.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
                    newImagePreview.style.border = '2px solid var(--purple-main)';
                };
                reader.onerror = function(error) {
                    console.error('❌ خطأ في قراءة الملف:', error);
                    alert('❌ حدث خطأ في تحميل الصورة');
                };
                reader.readAsDataURL(file);
            }
        });
        
        console.log('✅ تم إعداد event listeners لاختيار الصورة');
    } else {
        console.error('❌ لم يتم العثور على عناصر اختيار الصورة');
    }
}

// 🆕 دالة عرض عروض الترحيب للزوار الجدد
function showWelcomeOffers() {
    // التحقق إذا كان المستخدم زائراً جديداً (أول زيارة)
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    
    if (!hasVisitedBefore) {
        // جلب العروض النشطة
        fetch('/api/offers/active')
            .then(response => response.json())
            .then(offers => {
                if (offers.length > 0) {
                    setTimeout(() => {
                        showOffersPopup(offers);
                    }, 2000); // عرض بعد ثانيتين
                }
            })
            .catch(error => console.error('Error fetching offers:', error));
        
        // وضع علامة أن المستخدم زار الموقع
        localStorage.setItem('hasVisitedBefore', 'true');
    }
}

// 🆕 دالة عرض نافذة العروض
function showOffersPopup(offers) {
    const offersHTML = offers.map(offer => `
        <div class="offer-item" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: var(--radius-card); margin-bottom: 1rem; text-align: center;">
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.3rem;">${offer.title}</h3>
            <p style="margin: 0 0 1rem 0; opacity: 0.9;">${offer.description}</p>
            ${offer.discountPercentage ? `
                <div style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: var(--radius-button); display: inline-block;">
                    <strong>خصم ${offer.discountPercentage}%</strong>
                </div>
            ` : ''}
            ${offer.discountAmount ? `
                <div style="background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: var(--radius-button); display: inline-block;">
                    <strong>وفر ${offer.discountAmount}$</strong>
                </div>
            ` : ''}
            <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                ⏳ ينتهي في ${new Date(offer.endDate).toLocaleDateString('ar-EG')}
            </div>
        </div>
    `).join('');

    const popupHTML = `
        <div id="welcome-offers-popup" class="popup-overlay" style="display: flex; background: rgba(0,0,0,0.8);">
            <div class="popup-content" style="max-width: 500px; background: var(--white-pure);">
                <button class="close-btn" id="close-offers-popup">
                    <i class="ph-bold ph-x"></i>
                </button>
                <div class="popup-header">
                    <i class="ph-bold ph-gift" style="color: var(--purple-main);"></i>
                    <h2>🎁 عروض ترحيبية خاصة!</h2>
                </div>
                <div style="padding: 1rem;">
                    <p style="text-align: center; color: var(--text-light); margin-bottom: 1.5rem;">
                        نرحب بك في متجرنا! هذه العروض الحصرية متاحة لك خلال 48 ساعة:
                    </p>
                    ${offersHTML}
                    <button id="explore-offers-btn" class="pill-button primary-button" style="width: 100%; margin-top: 1.5rem;">
                        <i class="ph-bold ph-shopping-cart"></i> استكشاف الخدمات
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);

    // ربط الأحداث
    document.getElementById('close-offers-popup').addEventListener('click', closeOffersPopup);
    document.getElementById('explore-offers-btn').addEventListener('click', closeOffersPopup);
    
    document.getElementById('welcome-offers-popup').addEventListener('click', function(e) {
        if (e.target === this) closeOffersPopup();
    });
}

// 🆕 دالة إغلاق نافذة العروض
function closeOffersPopup() {
    const popup = document.getElementById('welcome-offers-popup');
    if (popup) {
        popup.remove();
    }
}

// في app.js - أضف هذه الدوال

// دالة لجلب العروض النشطة
// دالة لجلب العروض النشطة - محسنة
async function fetchActiveOffers() {
    const offersContainer = document.getElementById('offers-container');
    
    // 🆕 إظهار حالة التحميل
    if (offersContainer) {
        offersContainer.innerHTML = `
            <div class="loading-spinner" style="text-align: center; padding: 2rem;">
                <i class="ph-bold ph-circle-notch animate-spin" style="font-size: 2rem; color: var(--purple-main);"></i>
                <p style="margin-top: 1rem; color: var(--text-light);">جاري تحميل العروض...</p>
            </div>
        `;
    }
    
    try {
        const response = await apiFetch('/api/offers/active');
        if (!response.ok) {
            throw new Error('فشل جلب العروض');
        }
        
        const offers = await response.json();
        console.log('📦 العروض المستلمة:', offers.length);
        renderOffers(offers);
        
    } catch (error) {
        console.error('Error fetching offers:', error);
        
        // 🆕 عرض رسالة خطأ
        if (offersContainer) {
            offersContainer.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 2rem; color: var(--danger-red);">
                    <i class="ph-bold ph-warning-circle"></i>
                    <p>فشل تحميل العروض. يرجى تحديث الصفحة.</p>
                </div>
            `;
        }
    }
}

// دالة لعرض العروض - مصححة
// دالة لعرض العروض - مصححة
function renderOffers(offers) {
    const offersContainer = document.getElementById('offers-container');
    const offersCount = document.getElementById('offers-count');
    const offersSection = document.getElementById('offers-section');
    
    if (!offersContainer) return;
    
    // تحديث عدد العروض
    if (offersCount) {
        offersCount.textContent = `(${offers ? offers.length : 0} عرض)`;
    }
    
    // إخفاء القسم إذا لم يكن هناك عروض
    if (!offers || offers.length === 0) {
        if (offersSection) offersSection.style.display = 'none';
        offersContainer.innerHTML = `
            <div class="no-offers" style="text-align: center; padding: 3rem; color: var(--text-light);">
                <i class="ph-bold ph-gift" style="font-size: 3rem; opacity: 0.5; margin-bottom: 1rem; display: block;"></i>
                <p>لا توجد عروض حالياً. تابعنا للحصول على أحدث العروض!</p>
            </div>
        `;
        return;
    } else {
        if (offersSection) offersSection.style.display = 'block';
    }
    
    offersContainer.innerHTML = offers.map(offer => {
        const discountText = offer.discountPercentage ? 
            `خصم ${offer.discountPercentage}%` : 
            offer.discountAmount ? 
            `وفر ${offer.discountAmount}$` : 
            'عرض خاص';
        
        const periodText = `ينتهي في ${new Date(offer.endDate).toLocaleDateString('ar-EG')}`;
        
        const targetText = {
            'all': 'لجميع المستخدمين',
            'new': 'للمستخدمين الجدد فقط',
            'existing': 'للمستخدمين الحاليين فقط'
        }[offer.targetUsers] || offer.targetUsers;
        
        const isHotOffer = offer.discountPercentage > 20 || offer.discountAmount > 10;
        
        return `
            <div class="offer-card ${isHotOffer ? 'hot-offer' : ''}" data-offer-id="${offer._id}">
                <div class="offer-header">
                    <h3 class="offer-title">${offer.title}</h3>
                    <span class="offer-badge">${discountText}</span>
                </div>
                <p class="offer-description">${offer.description}</p>
                <div class="offer-details">
                    <span class="discount-amount">${discountText}</span>
                    <div class="offer-period">
                        <i class="ph-bold ph-clock"></i>
                        <span>${periodText}</span>
                    </div>
                </div>
                <span class="offer-target">${targetText}</span>
                
                ${!userInfo && offer.targetUsers !== 'all' ? `
                    <div class="offer-login-required" style="margin-top: 1rem; padding: 1rem; background: var(--purple-light); border-radius: var(--radius-input); text-align: center;">
                        <p style="margin: 0 0 0.5rem 0; color: var(--purple-main); font-weight: 600;">
                            <i class="ph-bold ph-lock"></i> لتستفيد من هذا العرض
                        </p>
                        <button class="offer-login-btn pill-button primary-button" style="padding: 0.5rem 1rem; font-size: 0.9rem;">
                            <i class="ph-bold ph-user-plus"></i> سجل دخول الآن
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // 🆕 أضف event listeners للأزرار بعد إنشاء العروض
    setTimeout(() => {
        document.querySelectorAll('.offer-login-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // استخدم الدالة المحلية بدلاً من العالمية
                if (typeof showAuthPopup === 'function') {
                    showAuthPopup('register');
                } else {
                    // Fallback: افتح نافذة التسجيل يدوياً
                    authPopupOverlay.classList.remove('hidden');
                    loginFormContainer.classList.add('hidden');
                    registerFormContainer.classList.remove('hidden');
                }
            });
        });
    }, 100);
}

// 🔍 نظام البحث والفلترة
function setupSearchSystem() {
    const searchInput = document.getElementById('services-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let currentFilter = 'all';

    if (!searchInput) return;

    // بحث أثناء الكتابة
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.trim().toLowerCase();
        clearSearchBtn.classList.toggle('hidden', !searchTerm);
        filterServices(searchTerm, currentFilter);
    });

    // مسح البحث
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        filterServices('', currentFilter);
        searchInput.focus();
    });

    // الفلترة
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            filterServices(searchInput.value.trim().toLowerCase(), currentFilter);
        });
    });
}

function filterServices(searchTerm, filter) {
    const servicesContainer = document.getElementById('services-container');
    const serviceCards = servicesContainer.querySelectorAll('.service-card');
    let visibleCount = 0;

    serviceCards.forEach(card => {
        const platform = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        const servicesList = servicesData[card.querySelector('h3').textContent]?.services || [];
        
        let matchesSearch = true;
        let matchesFilter = true;

        // تطبيق البحث
        if (searchTerm) {
            const serviceMatches = servicesList.some(service => 
                service.name.toLowerCase().includes(searchTerm) ||
                service.platform.toLowerCase().includes(searchTerm)
            );
            matchesSearch = platform.includes(searchTerm) || 
                          description.includes(searchTerm) || 
                          serviceMatches;
        }

        // تطبيق الفلتر
        if (filter !== 'all') {
            matchesFilter = platform.includes(filter);
        }

        // إظهار/إخفاء البطاقة
        if (matchesSearch && matchesFilter) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // عرض عدد النتائج
    showSearchResultsCount(visibleCount, serviceCards.length);
}

function showSearchResultsCount(visible, total) {
    let resultsCount = document.getElementById('search-results-count');
    if (!resultsCount) {
        resultsCount = document.createElement('div');
        resultsCount.id = 'search-results-count';
        resultsCount.className = 'search-results-count';
        document.querySelector('.search-section .container').appendChild(resultsCount);
    }

    if (visible === 0) {
        resultsCount.innerHTML = '<div class="no-results"><i class="ph-bold ph-magnifying-glass"></i><p>لم يتم العثور على خدمات تطابق بحثك</p></div>';
    } else {
        resultsCount.textContent = `عرض ${visible} من ${total} خدمة`;
    }
}
    
    // --- 3. نظام شحن الرصيد ---
    // --- 3. نظام شحن الرصيد ---
function showDepositPopup() {
    depositForm.reset();
    depositFormResponse.textContent = '';
    depositFormResponse.className = 'form-message';
    paymentDetailsContainer.classList.add('hidden');
    paymentMethodBtns.forEach(btn => btn.classList.remove('active'));
    depositPopupOverlay.classList.remove('hidden');
}

function hideDepositPopup() { 
    depositPopupOverlay.classList.add('hidden'); 
}

function handlePaymentMethodSelect(event) {
    const selectedMethod = event.currentTarget.dataset.method;
    paymentMethodBtns.forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    // 🆕 تحديد الحد الأدنى لكل طريقة
    let minAmount = 1;
    let minMessage = '';
    
    switch (selectedMethod) {
        case 'bank':
            minAmount = 10;
            minMessage = 'الحد الأدنى للتحويل البنكي: 10 دولار';
            break;
        case 'sham':
            minAmount = 5;
            minMessage = 'الحد الأدنى لشام كاش: 5 دولار';
            break;
        case 'usdt':
        case 'trx':
        case 'bnb':
            minAmount = 10;
            minMessage = 'الحد الأدنى للعملات الرقمية: 10 دولار';
            break;
        case 'whatsapp':
            minAmount = 50;
            minMessage = 'الحد الأدنى للحوالة المكتبية: 50 دولار';
            break;
         case 'payeer':
            minAmount = 10;
            minMessage = 'الحد الأدنى لـ PAYEER: 10$';
            break;
         case 'binance-pay': 
            minAmount = 10;
            minMessage = 'الحد الأدنى لـ Binance Pay: 10$';
            break;
            
    }
    
    // 🆕 تحديث حقل المبلغ
    const amountInput = document.getElementById('deposit-amount');
    if (amountInput) {
        amountInput.min = minAmount;
        amountInput.value = minAmount;
        amountInput.setAttribute('data-min', minAmount);
        
        // 🆕 إضافة رسالة الحد الأدنى
        let minLabel = amountInput.parentElement.querySelector('.min-amount-label');
        if (!minLabel) {
            minLabel = document.createElement('small');
            minLabel.className = 'min-amount-label';
            amountInput.parentElement.appendChild(minLabel);
        }
        minLabel.textContent = minMessage;
        minLabel.style.color = 'var(--info-blue)';
        minLabel.style.fontWeight = '600';
        minLabel.style.display = 'block';
        minLabel.style.marginTop = '0.3rem';
    }
    
    let detailsHTML = '';
    switch (selectedMethod) {
        case 'bank': 
            detailsHTML = `
                <p>يرجى تحويل المبلغ إلى الحساب التالي:</p>
                <p><strong>الاسم:</strong> <span>MUHAMMED ERRAHIM</span></p>
                <p><strong>رقم الحساب (IBAN):</strong></p>
                <div class="wallet-address" style="margin-top: 0.5rem;">
                        <div class="address-container">
                            <span class="address-text">TR77 0014 3000 0000 0013 8811 28</span>
                            <div class="copy-icon" data-address="TR77 0014 3000 0000 0013 8811 28">
                                <i class="ph-bold ph-copy"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `; 
            break;
            
                case 'sham':
            detailsHTML = `
                <p>يمكنك الدفع عبر شام كاش باستخدام إحدى الطريقتين:</p>
                
                <!-- 1. مسح الباركود -->
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <img src="https://i.ibb.co/Y43J4f7y/IMG-20251205-WA0016.jpg" alt="Sham Cash QR Code" style="max-width: 220px; height: auto; border-radius: 12px; margin: 0.5rem auto; display: block; border: 1px solid var(--gray-border);">
                    <small style="color: var(--text-light);">امسح الرمز للدفع السريع</small>
                </div>

                <!-- 2. النسخ اليدوي -->
                <div>
                    <p style="margin-bottom: 0.5rem;">أو أرسل إلى الحساب التالي يدوياً:</p>
                    <p><strong>الاسم:</strong> <span>Mohamed Nour Al Rahim</span></p>
                    <p><strong>كود الحساب:</strong></p>
                    <div class="wallet-address" style="margin-top: 0.5rem;">
                        <div class="address-container">
                            <span class="address-text">0bc3c408794e5087db1ba11924b2003a</span>
                            <div class="copy-icon" data-address="0bc3c408794e5087db1ba11924b2003a">
                                <i class="ph-bold ph-copy"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `; 
            break;
            
        case 'whatsapp': 
            detailsHTML = `
                <p>للحوالة عبر مكتب، يرجى التواصل معنا عبر واتساب للحصول على التفاصيل.</p>
                <div class="whatsapp-contact">
                    <button type="button" class="pill-button primary-button" id="whatsapp-contact-btn" style="margin: 1rem auto; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="ph-bold ph-whatsapp-logo"></i>
                        <span>تواصل معنا على واتساب</span>
                    </button>
                    <p style="text-align: center; font-size: 0.9rem; color: var(--text-light); margin-top: 0.5rem;">
                        سيتم فتح محادثة واتساب مع رسالة جاهزة
                    </p>
                </div>
            `; 
            break;
            
        case 'usdt':
            detailsHTML = `
                <p><strong>💰 اسم العملية:</strong> USDT</p>
                <p><strong>🌐 اسم الشبكة:</strong> Tron (TRC20)</p>
                <p><strong>📍 عنوان الدفع:</strong></p>
                <div class="wallet-address">
                    <div class="address-container">
                        <span class="address-text">TUx6cUrvy34Fh1jeYG8AQxrperJaWRhGhM</span>
                        <div class="copy-icon" data-address="TUx6cUrvy34Fh1jeYG8AQxrperJaWRhGhM">
                            <i class="ph-bold ph-copy"></i>
                        </div>
                    </div>
                </div>
                <p class="warning-note">⚠️ تأكد من إرسال USDT فقط عبر شبكة TRC20</p>
            `;
            break;
            
        case 'trx':
            detailsHTML = `
                <p><strong>💰 اسم العملية:</strong> TRX</p>
                <p><strong>🌐 اسم الشبكة:</strong> Tron (TRC20)</p>
                <p><strong>📍 عنوان الدفع:</strong></p>
                <div class="wallet-address">
                    <div class="address-container">
                        <span class="address-text">TUx6cUrvy34Fh1jeYG8AQxrperJaWRhGhM</span>
                        <div class="copy-icon" data-address="TUx6cUrvy34Fh1jeYG8AQxrperJaWRhGhM">
                            <i class="ph-bold ph-copy"></i>
                        </div>
                    </div>
                </div>                
                <p class="warning-note">⚠️ تأكد من إرسال TRX فقط عبر شبكة TRC20</p>
            `;
            break;

            case 'payeer':
            detailsHTML = `
                <p><strong>💰 اسم العملية:</strong> PAYEER</p>
                <p><strong>🆔 رقم الحساب:</strong></p>
                <div class="wallet-address">
                    <div class="address-container">
                        <span class="address-text">P1031685181</span>
                        <div class="copy-icon" data-address="P1031685181">
                            <i class="ph-bold ph-copy"></i>
                        </div>
                    </div>
                </div>
                <p class="warning-note">⚠️ تأكد من إرسال المبلغ بالدولار الأمريكي (USD).</p>
            `;
            break;

            case 'binance-pay':
            detailsHTML = `
                <p><strong>💰 اسم العملية:</strong>  Binance Pay</p>
                <p><strong>🆔 معرف الدفع (Pay ID):</strong></p>
                <div class="wallet-address">
                    <div class="address-container">
                        <span class="address-text">338952269</span>
                        <div class="copy-icon" data-address="338952269">
                            <i class="ph-bold ph-copy"></i>
                        </div>
                    </div>
                </div>
                <p class="warning-note">⚠️ تأكد من إرسال المبلغ بعملة USDT.</p>
            `;
            break;

        case 'bnb':
            detailsHTML = `
                <p><strong>💰 اسم العملية:</strong> BNB</p>
                <p><strong>🌐 اسم الشبكة:</strong> BNB Smart Chain (BEP20)</p>
                <p><strong>📍 عنوان الدفع:</strong></p>
                <div class="wallet-address">
                    <div class="address-container">
                        <span class="address-text">0x2de85d9b65a9eae384ae42d785d9d6ca2a379fbd</span>
                        <div class="copy-icon" data-address="0x2de85d9b65a9eae384ae42d785d9d6ca2a379fbd">
                            <i class="ph-bold ph-copy"></i>
                        </div>
                    </div>
                </div>
                <p class="warning-note">⚠️ تأكد من إرسال BNB فقط عبر شبكة BEP20</p>
            `;
            break;
    }
    
    paymentDetailsContainer.innerHTML = detailsHTML;
    paymentDetailsContainer.classList.remove('hidden');
    
    // 🆕 إعداد زر التواصل على واتساب
    const whatsappBtn = document.getElementById('whatsapp-contact-btn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', openWhatsAppContact);
    }
    
    // إعداد أحداث النسخ
    setupCopyButtons();
}

// 🆕 دالة فتح واتساب مع رسالة جاهزة
function openWhatsAppContact() {
    const phoneNumber = "905367893256"; // رقم الواتساب
    const message = encodeURIComponent(`مرحباً، أريد معلومات حول الحوالة المكتبية لإيداع رصيد في المتجر.
    
المبلغ الذي أريد إيداعه: [يرجى كتابة المبلغ]
الطريقة: حوالة مكتبية
اسمي: [اسمك]`);

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
}

// 🆕 دالة نسخ العنوان للمحفظة - مصححة
// 🆕 دالة لإعداد أحداث النسخ
// 🔽 استبدال دالة setupCopyButtons بهذا الكود 🔽
function setupCopyButtons() {
    // 1. النسخ عند النقر على أيقونة النسخ
    document.querySelectorAll('.copy-icon').forEach(icon => {
        // إزالة أي أحداث سابقة أولاً
        const newIcon = icon.cloneNode(true);
        icon.parentNode.replaceChild(newIcon, icon);
        
        // إضافة حدث جديد
        newIcon.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const address = this.getAttribute('data-address');
            if (address) {
                copyAddress(address, this);
            }
        });
    });
    
    // 2. النسخ عند النقر على النص نفسه
    document.querySelectorAll('.address-text').forEach(textElement => {
        textElement.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const address = this.textContent;
            copyToClipboard(this);
            
            // إيجاد أيقونة النسخ المرتبطة وتحديثها
            const copyIcon = this.closest('.address-container')?.querySelector('.copy-icon');
            if (copyIcon) {
                showCopySuccessOnIcon(copyIcon);
            }
        });
    });
}
// 🆕 دالة نسخ العنوان مع تحديث الأيقونة
function copyAddress(address, iconElement) {
    navigator.clipboard.writeText(address).then(() => {
        // تحديث الأيقونة
        showCopySuccessOnIcon(iconElement);
        
        // إظهار رسالة النجاح
        showCopySuccessMessage('تم نسخ العنوان بنجاح!');
        
    }).catch(err => {
        console.error('فشل النسخ: ', err);
        showCopySuccessMessage('❌ فشل نسخ العنوان، يرجى نسخه يدوياً', true);
    });
}

// 🆕 دالة نسخ النص المباشر
function copyToClipboard(textElement) {
    const text = textElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
        // تغيير مظهر النص مؤقتاً
        const originalColor = textElement.style.color;
        const originalBg = textElement.style.backgroundColor;
        
        textElement.style.color = 'var(--success-green)';
        textElement.style.backgroundColor = 'var(--purple-light)';
        textElement.style.fontWeight = 'bold';
        
        // إظهار رسالة النجاح
        showCopySuccessMessage('تم نسخ العنوان بنجاح!');
        
        setTimeout(() => {
            textElement.style.color = originalColor;
            textElement.style.backgroundColor = originalBg;
            textElement.style.fontWeight = '';
        }, 2000);
        
    }).catch(err => {
        console.error('فشل النسخ: ', err);
        showCopySuccessMessage('❌ فشل نسخ العنوان، يرجى نسخه يدوياً', true);
    });
}

// 🆕 دالة تحديث أيقونة النسخ
function showCopySuccessOnIcon(iconElement) {
    const originalHTML = iconElement.innerHTML;
    const originalBg = iconElement.style.background;
    
    iconElement.innerHTML = '<i class="ph-bold ph-check"></i>';
    iconElement.style.background = 'var(--success-green)';
    
    setTimeout(() => {
        iconElement.innerHTML = originalHTML;
        iconElement.style.background = originalBg;
    }, 2000);
}

// 🆕 دالة عرض رسالة النجاح
function showCopySuccessMessage(message, isError = false) {
    // إزالة أي رسالة سابقة
    const oldMessage = document.querySelector('.copy-success-msg');
    if (oldMessage) oldMessage.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'copy-success-msg';
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="ph-bold ph-${isError ? 'warning-circle' : 'check-circle'}" 
               style="color: ${isError ? 'var(--danger-red)' : 'var(--success-green)'};"></i>
            <span>${message}</span>
        </div>
    `;
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-card);
        box-shadow: var(--shadow-lg);
        border-left: 4px solid ${isError ? 'var(--danger-red)' : 'var(--success-green)'};
        z-index: 10001;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 300);
    }, 3000);
}
    async function handleDepositSubmit(event) {
    event.preventDefault();
    depositFormResponse.textContent = 'جاري إرسال الطلب...';
    depositFormResponse.className = 'form-message';
    
    const receiptFile = document.getElementById('deposit-receipt').files[0];
    const selectedMethod = document.querySelector('.payment-method-btn.active');
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseFloat(amountInput.value);
    
    if (!selectedMethod) { 
        depositFormResponse.textContent = 'الرجاء اختيار طريقة الدفع.'; 
        depositFormResponse.className = 'form-message error'; 
        return; 
    }
    
    // 🆕 التحقق من الحد الأدنى
    const method = selectedMethod.dataset.method;
    let minAmount = 1;
    
    // 🎯🎯🎯 التعديلات هنا 🎯🎯🎯
    switch (method) {
        case 'bank': minAmount = 10; break;
        case 'sham': minAmount = 5; break;
        case 'whatsapp': minAmount = 50; break; // 🎯 تم التحديث
        case 'payeer': minAmount = 10; break; // 🎯 تم التحديث
        case 'binance-pay': minAmount = 10; break; // 🎯 تم التحديث
        case 'usdt':
        case 'trx':
        case 'bnb': minAmount = 10; break;
    }
    
    if (amount < minAmount) {
        depositFormResponse.textContent = `الحد الأدنى لهذه الطريقة هو ${minAmount}$`; 
        depositFormResponse.className = 'form-message error'; 
        return; 
    }

    
    if (!receiptFile) { 
        depositFormResponse.textContent = 'الرجاء رفع صورة الإيصال.'; 
        depositFormResponse.className = 'form-message error'; 
        return; 
    }
        
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
        
        try {
            const imageBase64 = await toBase64(receiptFile);
            const depositData = { 
                userId: userInfo._id, 
                amount: document.getElementById('deposit-amount').value, 
                depositorName: document.getElementById('depositor-name').value, 
                method: selectedMethod.dataset.method, 
                receiptImage: imageBase64 
            };
            
            const response = await apiFetch('/api/deposits', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(depositData) 
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل إرسال الطلب.');
            
            depositFormResponse.textContent = result.message;
            depositFormResponse.className = 'form-message success';
            setTimeout(hideDepositPopup, 3000);
            
        } catch (error) {
            depositFormResponse.textContent = error.message;
            depositFormResponse.className = 'form-message error';
        }
    }

    // --- 4. تحميل وعرض الخدمات ---
    async function loadServices() {
        try {
            const response = await apiFetch('/api/services');
            if (!response.ok) throw new Error('Network response was not ok');
            const servicesFromDB = await response.json();
            
            servicesData = servicesFromDB.reduce((acc, service) => {
                const platform = service.platform;
                if (!acc[platform]) { 
                    acc[platform] = { 
                        icon: getPlatformIcon(platform), 
                        description: `خدمات متنوعة لمنصة ${platform}`, 
                        validation: getPlatformValidation(platform), 
                        services: [] 
                    }; 
                }
                acc[platform].services.push(service);
                return acc;
            }, {});
            
            renderServiceCards();
            
        } catch (error) {
            console.error("Failed to load services from API:", error);
            servicesContainer.innerHTML = '<p style="color:white; text-align:center;">فشل تحميل الخدمات. يرجى المحاولة مرة أخرى.</p>';
        }
    }

    // 🔽🔽 استبدل الدالة القديمة بالكامل بهذه النسخة المطورة 🔽🔽
function getPlatformIcon(platform, serviceName = '') {
    const p = platform.toLowerCase().trim();
    const s = serviceName.toLowerCase().trim();

    // --- 1. الأولوية للكلمات المفتاحية الخاصة ---
    if (s.includes('توثيق')) {
        // ✅ أيقونة توثيق جديدة وواضحة
        return 'https://i.ibb.co/LdGBs2j/file-000000000a6081f5b61ed1dbb4f89643.png'; 
    }
    if (s.includes('خاص') || s.includes('private')) {
        return 'https://i.ibb.co/fGScgM4/file-000000000f2871f5b61ed1dbb4f89643.png';
    }

    // --- 2. البحث عن اسم المنصة (بروابط محسنة) ---
    // تويتر / X
    if (p.includes('twitter') || p.includes('تويتر') || p === 'x' || p === 'اكس') {
        return 'https://i.ibb.co/5ghPT58L/5a7a34abbaf48383f76062a5b8a6a22b.jpg';
    }
    // واتساب
    if (p.includes('whatsapp') || p.includes('واتساب') || p.includes('واتس اب') || p.includes('واتس')) {
        return 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg';
    }
    // ديسكورد
    if (p.includes('discord') || p.includes('ديسكورد')) {
        // ✅ أيقونة بدون اسم
        return 'https://i.ibb.co/LW9bchh/88d419fe6a6c79323df65ea11b9eaac6.jpg';
    }
    // تيك توك
    if (p.includes('tiktok') || p.includes('تيك توك')) {
        // ✅ أيقونة بدون اسم
        return 'https://i.ibb.co/ZzGx3V0m/94e9aed2396372bada54b9f4295e469a.jpg';
    }
    // ثريدز
    if (p.includes('threads') || p.includes('ثريدز')) {
        // ✅ أيقونة جديدة
        return 'https://i.ibb.co/wZT7cM4K/203a752779f46b53971bef4639c6043a.jpg';
    }
    // سبوتيفاي
    if (p.includes('spotify') || p.includes('سبوتيفاي')) {
        return 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg';
    }
    // كواي
    if (p.includes('kwai') || p.includes('كواي')) {
        return 'https://i.ibb.co/hCM7NSJ/11.png'; // أيقونة مؤقتة
    }
    // كيك
    if (p.includes('kick') || p.includes('كيك')) {
        return 'https://i.ibb.co/hCM7NSJ/11.png'; // أيقونة مؤقتة
    }
    // لينكدإن
    if (p.includes('linkedin') || p.includes('لينكد')) {
        return 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png';
    }
    // ريديت
    if (p.includes('reddit') || p.includes('ريديت')) {
        return 'https://upload.wikimedia.org/wikipedia/en/b/bd/Reddit_Logo_Icon.svg';
    }
    // جوجل
    if (p.includes('google') || p.includes('جوجل')) {
        return 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg';
    }
    
    // --- 3. الأيقونات الأصلية (Fallback) ---
    if (p.includes('instagram') || p.includes('انستجرام')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
    if (p.includes('facebook') || p.includes('فيس بوك')) return 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg';
    if (p.includes('youtube') || p.includes('يوتيوب')) return 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg';
    if (p.includes('telegram') || p.includes('تيليجرام')) return 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg';
    if (p.includes('snapchat') || p.includes('سناب شات')) return 'https://upload.wikimedia.org/wikipedia/en/c/c4/Snapchat_logo.svg';
    
    // --- 4. أيقونة افتراضية ---
    try {
        const initial = encodeURIComponent(platform.charAt(0).toUpperCase());
        return `https://ui-avatars.com/api/?name=${initial}&background=random&size=50&color=fff`;
    } catch (e) { 
        return '';
    }
}

    function getPlatformValidation(platform) {
        const p = platform.toLowerCase().trim();
        if (p.includes('instagram') || p.includes('انستجرام') || p.includes('انستا')) return /instagram\.com/;
        if (p.includes('tiktok') || p.includes('تيك توك')) return /tiktok\.com/;
        if (p.includes('twitter') || p.includes('تويتر') || p === 'x') return /(twitter|x)\.com/;
        if (p.includes('facebook') || p.includes('فيس بوك') || p.includes('فيسبوك')) return /facebook\.com/;
        if (p.includes('youtube') || p.includes('يوتيوب')) return /(youtube\.com|youtu\.be)/;
        if (p.includes('telegram') || p.includes('تيليجرام')) return /(telegram\.me|t\.me)/;
        if (p.includes('snapchat') || p.includes('سناب شات')) return /snapchat\.com/;
        if (p.includes('threads') || p.includes('ثريدز')) return /threads\.net/;
        return new RegExp(`${p.replace(/\s/g, '')}\\.com`, 'i');
    }

    function renderServiceCards() {
        servicesContainer.innerHTML = '';
        if (Object.keys(servicesData).length === 0) { 
            servicesContainer.innerHTML = '<p style="color:white; text-align:center;">لا توجد خدمات متاحة حالياً.</p>'; 
            return; 
        }
        
        for (const platform in servicesData) {
            const data = servicesData[platform];
            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="icon-wrapper">
                    <img src="${data.icon}" alt="${platform} icon" onerror="this.style.display='none'">
                </div>
                <h3>${platform}</h3>
                <p>${data.description}</p>
                <button class="pill-button get-button">
                    <i class="ph-bold ph-arrow-circle-right"></i>
                    <span>اطلب الآن</span>
                </button>
            `;
            card.addEventListener('click', () => showOrderForm(platform));
            servicesContainer.appendChild(card);
        }
    }

    // --- 5. إظهار وتحديث نموذج الطلب ---
    function showOrderForm(platform) {
    refreshUserData();
    currentPlatform = platform;
    orderFormContainer.classList.remove('hidden');
    successMessageContainer.classList.add('hidden');
    paymentOptionsContainer.classList.add('hidden');
    formTitle.textContent = `طلب خدمة لـ ${platform}`;
    
    // 🔽🔽 ابدأ التعديل من هنا 🔽🔽
    
    // مسح الخيارات القديمة وتعبئتها بالجديدة
    serviceSelect.innerHTML = '';
    servicesData[platform].services.forEach(service => {
        const option = document.createElement('option');
        option.value = service.name;
        option.dataset.price = service.pricePer1000;
        option.dataset.min = service.min;
        option.dataset.max = service.max;
        option.dataset.step = service.step || 1;
        option.textContent = `${service.name}`;
        serviceSelect.appendChild(option);
    });

    // دالة داخلية لتحديث أيقونة النافذة المنبثقة
    const updatePopupIcon = () => {
        const selectedServiceName = serviceSelect.value;
        const iconUrl = getPlatformIcon(platform, selectedServiceName);
        
        // استخدام innerHTML لوضع عنصر <img> مباشرة
        popupIcon.innerHTML = `<img src="${iconUrl}" alt="${platform}" style="width: 32px; height: 32px; object-fit: contain;">`;
        popupIcon.className = ''; // إزالة أي classes قديمة مثل ph-bold
    };

    // استدعاء الدالة عند فتح النافذة لأول مرة
    updatePopupIcon();
    
    // إضافة مستمع لتحديث الأيقونة عند تغيير الخدمة
    serviceSelect.addEventListener('change', updatePopupIcon);

    // 🔼🔼 نهاية التعديل 🔼🔼

    orderForm.reset();
    linkError.textContent = '';
    quantityError.textContent = '';
    orderPopupOverlay.classList.remove('hidden');
    updateFormBasedOnService();
}


    function updateFormBasedOnService() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return;
        
        const min = selectedOption.dataset.min;
        const max = selectedOption.dataset.max;
        const step = selectedOption.dataset.step;
        
        quantityInput.min = min;
        quantityInput.max = max;
        quantityInput.step = step;
        quantityInput.value = Math.max(min, 1000);
        quantityInput.placeholder = `الكمية (بين ${min} و ${max})`;
        updatePrice();
    }

    // في app.js - استبدل دالة updatePrice
// استبدل دالة updatePrice
async function updatePrice() {
    const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
    if (!selectedOption) return;
    
    const quantity = parseInt(quantityInput.value, 10);
    
    // 🆕 إذا كانت الكمية فارغة أو غير صالحة
    if (isNaN(quantity) || quantity <= 0) { 
        priceDisplay.textContent = '0.00 $'; 
        return; 
    }

    // 🆕 إلغاء الحساب السابق إذا كان موجوداً
    if (priceUpdateTimeout) {
        clearTimeout(priceUpdateTimeout);
    }

    // 🆕 استخدام debounce لتجنب طلبات متعددة
    priceUpdateTimeout = setTimeout(async () => {
        try {
            // حساب السعر مع الخصم
            const priceData = await calculatePriceWithDiscount(
                serviceSelect.value,
                currentPlatform,
                quantity,
                userInfo ? userInfo._id : null
            );
            
            // 🆕 تحديث واجهة المستخدم
            if (priceData.hasDiscount && priceData.discount > 0) {
                priceDisplay.innerHTML = `
                    <span style="text-decoration: line-through; color: var(--text-light); margin-left: 0.5rem;">
                        ${priceData.originalPrice.toFixed(2)} $
                    </span>
                    <span style="color: var(--success-green); font-weight: bold;">
                        ${priceData.finalPrice.toFixed(2)} $
                    </span>
                    <div style="font-size: 0.8rem; color: var(--success-green);">
                        وفرت ${priceData.discount.toFixed(2)} $ 🎉
                    </div>
                `;
            } else {
                priceDisplay.textContent = `${priceData.finalPrice.toFixed(2)} $`;
            }
            
            priceDisplay.style.transform = 'scale(1.1)';
            setTimeout(() => {
                priceDisplay.style.transform = 'scale(1)';
            }, 200);

        } catch (error) {
            console.error('Error updating price:', error);
            // 🆕 Fallback: حساب سريع بدون خصم
            const pricePer1000 = parseFloat(selectedOption.dataset.price);
            const pricePerUnit = pricePer1000 / 1000;
            const finalPrice = pricePerUnit * quantity;
            priceDisplay.textContent = `${finalPrice.toFixed(2)} $`;
        }
    }, 300); // 🆕 انتظر 300ms بعد آخر كتابة
}

    function validateLink() {
        const link = linkInput.value;
        const platformData = servicesData[currentPlatform];
        if (platformData && link.length > 0 && !platformData.validation.test(link)) {
            linkError.textContent = `الرابط غير صحيح. يجب أن يكون رابط ${currentPlatform}.`;
            return false;
        }
        linkError.textContent = '';
        return true;
    }

    function validateQuantity() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return false;
        
        const quantity = parseInt(quantityInput.value, 10);
        const min = parseInt(selectedOption.dataset.min, 10);
        const max = parseInt(selectedOption.dataset.max, 10);
        const step = parseInt(selectedOption.dataset.step, 10);
        
        if (isNaN(quantity)) { 
            quantityError.textContent = 'الرجاء إدخال كمية صحيحة.'; 
            return false; 
        }
        if (quantity < min) { 
            quantityError.textContent = `الكمية يجب أن تكون ${min} على الأقل.`; 
            return false; 
        }
        if (quantity > max) { 
            quantityError.textContent = `الكمية يجب أن تكون ${max} على الأكثر.`; 
            return false; 
        }
        if (quantity % step !== 0) { 
            quantityError.textContent = `الكمية يجب أن تكون من مضاعفات ${step}.`; 
            return false; 
        }
        
        quantityError.textContent = '';
        return true;
    }

    // --- 6. معالجة إرسال الطلب وخيارات الدفع ---
    function handleFormSubmit(event) {
    event.preventDefault();
    if (!validateLink() || !validateQuantity()) {
        alert('الرجاء تصحيح الأخطاء في النموذج.');
        return;
    }
    
    // 🆕 حساب السعر النهائي قبل المتابعة
    const quantity = parseInt(quantityInput.value, 10);
    calculatePriceWithDiscount(
        serviceSelect.value,
        currentPlatform,
        quantity,
        userInfo ? userInfo._id : null
    ).then(priceData => {
        currentOrderData = { 
            platform: currentPlatform, 
            service: serviceSelect.value, 
            link: linkInput.value, 
            quantity: quantity, 
            price: priceData.finalPrice, // 🎯 استخدم السعر بعد الخصم
            userId: userInfo ? userInfo._id : null 
        };
        
        orderFormContainer.classList.add('hidden');
        paymentOptionsContainer.classList.remove('hidden');
        finalPriceDisplay.textContent = `${currentOrderData.price.toFixed(2)} $`;
        balanceError.textContent = '';
        
        if (userInfo && userInfo.balance >= currentOrderData.price) {
            payWithBalanceBtn.disabled = false;
        } else {
            payWithBalanceBtn.disabled = true;
            balanceError.textContent = userInfo ? 'رصيدك الحالي غير كافٍ.' : 'سجل الدخول للدفع بالرصيد.';
        }
    }).catch(error => {
        console.error('Error calculating final price:', error);
        alert('حدث خطأ في حساب السعر. يرجى المحاولة مرة أخرى.');
    });
}

    async function executePayWithBalance() {
        try {
            const response = await apiFetch('/api/orders/pay-with-balance', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(currentOrderData) 
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'فشل الدفع بالرصيد.');
            
            userInfo.balance = result.newBalance;
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            updateUIForAuth();
            paymentOptionsContainer.classList.add('hidden');
            formResponse.textContent = 'تم الدفع بنجاح! طلبك الآن قيد التنفيذ.';
            successMessageContainer.classList.remove('hidden');
            
        } catch (error) {
            balanceError.textContent = error.message;
        }
    }

    async function executePayWithWhatsapp() {
        const orderDataForWhatsapp = { ...currentOrderData, user: userInfo ? userInfo._id : null };
        
        try {
            await apiFetch('/api/orders', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(orderDataForWhatsapp) 
            });
        } catch (error) { 
            console.error("Failed to save order to DB, but proceeding.", error); 
        }
        
        const message = `*طلب جديد* 🎉\n---------------------\n*المنصة:* ${orderDataForWhatsapp.platform}\n*الخدمة:* ${orderDataForWhatsapp.service}\n*الكمية:* ${orderDataForWhatsapp.quantity}\n*السعر:* ${orderDataForWhatsapp.price.toFixed(2)}$\n*الرابط:* ${orderDataForWhatsapp.link}\n---------------------\n(رسالة منشأة تلقائياً)`;
        const adminPhoneNumber = "905367893256";
        const encodedMessage = encodeURIComponent(message.trim());
        const whatsappUrl = `https://wa.me/${adminPhoneNumber}?text=${encodedMessage}`;
        
        paymentOptionsContainer.classList.add('hidden');
        formResponse.textContent = 'ممتاز! سيتم الآن تحويلك إلى واتساب.';
        successMessageContainer.classList.remove('hidden');
        
        setTimeout(() => { 
            window.open(whatsappUrl, '_blank'); 
            hidePopup(); 
        }, 2500);
    }

    function hidePopup() { 
        orderPopupOverlay.classList.add('hidden'); 
    }

    // --- 6.5. نظام الإشعارات ---
    async function fetchNotifications() {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = localStorage.getItem('token');
        
        if (!userInfo || !token) {
            console.log("المستخدم غير مسجل دخول أو التوكن مفقود");
            return;
        }

        try {
            const response = await apiFetch('/api/notifications', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                console.error("التوكن منتهي الصلاحية - جاري تسجيل الخروج");
                logoutHandler();
                return;
            }

            if (!response.ok) {
                throw new Error(`فشل جلب الإشعارات. الحالة: ${response.status}`);
            }

            const notifications = await response.json();
            console.log('📨 الإشعارات المستلمة:', notifications);
            renderNotifications(notifications);

        } catch (error) {
            console.error("خطأ في جلب الإشعارات:", error);
            const notificationList = document.getElementById('notifications-list');
            if (notificationList) {
                notificationList.innerHTML = '<li class="no-notifications">فشل تحميل الإشعارات</li>';
            }
        }
    }

    function renderNotifications(notifications) {
        const list = document.getElementById('notifications-list');
        const countBadge = document.getElementById('notification-count');
        
        if (!list || !countBadge) {
            console.log('عناصر الإشعارات غير موجودة في الصفحة');
            return;
        }

        const unreadCount = notifications.filter(n => !n.read).length;
        countBadge.textContent = unreadCount;
        countBadge.classList.toggle('visible', unreadCount > 0);

        if (!notifications || notifications.length === 0) {
            list.innerHTML = '<li class="no-notifications">لا توجد إشعارات حالياً</li>';
            return;
        }

        list.innerHTML = notifications.map(notification => `
            <li>
                <a href="${notification.link || '#'}" class="notification-item ${notification.read ? '' : 'unread'}" data-notification-id="${notification._id}">
                    <p>${notification.message}</p>
                    <span class="timestamp">${formatNotificationDate(notification.createdAt)}</span>
                </a>
            </li>
        `).join('');

        console.log('✅ تم عرض الإشعارات بنجاح');
    }

    async function markNotificationsAsRead() {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const token = localStorage.getItem('token');
        
        if (!userInfo || !token) {
            console.log("لا يمكن تحديد الإشعارات كمقروءة - المستخدم غير مسجل");
            return;
        }

        try {
            const response = await apiFetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const countBadge = document.getElementById('notification-count');
                if (countBadge) {
                    countBadge.textContent = '0';
                    countBadge.classList.remove('visible');
                }
                
                document.querySelectorAll('.notification-item.unread').forEach(item => {
                    item.classList.remove('unread');
                });
                
                console.log('✅ تم تحديد جميع الإشعارات كمقروءة');
            } else {
                console.error('فشل تحديد الإشعارات كمقروءة');
            }
        } catch (error) {
            console.error('خطأ في تحديد الإشعارات كمقروءة:', error);
        }
    }

    function formatNotificationDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `قبل ${diffMins} دقيقة`;
        if (diffHours < 24) return `قبل ${diffHours} ساعة`;
        if (diffDays < 7) return `قبل ${diffDays} يوم`;
        
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // --- 7. ربط الأحداث ---
    closePopupButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hidePopup();
    });
    
    successOkButton.addEventListener('click', () => {
        hidePopup();
        setTimeout(() => {
            orderFormContainer.classList.remove('hidden');
            successMessageContainer.classList.add('hidden');
            paymentOptionsContainer.classList.add('hidden');
        }, 500);
    });
    
    orderPopupOverlay.addEventListener('click', (e) => {
        if (e.target === orderPopupOverlay) {
            hidePopup();
        }
    });
    
    serviceSelect.addEventListener('change', updateFormBasedOnService);
    quantityInput.addEventListener('input', () => { 
        updatePrice(); 
        validateQuantity(); 
    });
    linkInput.addEventListener('input', validateLink);
    orderForm.addEventListener('submit', handleFormSubmit);
    showRegisterLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showAuthPopup('register'); 
    });
    showLoginLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        showAuthPopup('login'); 
    });
    loginFormPopup.addEventListener('submit', loginHandler);
    registerFormPopup.addEventListener('submit', registerHandler);
    
    authPopupOverlay.addEventListener('click', (e) => { 
        if (e.target === authPopupOverlay || e.target.closest('.close-btn')) {
            hideAuthPopup(); 
        }
    });
    
    closeDepositPopupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        hideDepositPopup();
    });
    
    depositPopupOverlay.addEventListener('click', (e) => {
        if (e.target === depositPopupOverlay) {
            hideDepositPopup();
        }
    });
    
    paymentMethodBtns.forEach(btn => {
        btn.addEventListener('click', handlePaymentMethodSelect);
    });
    
    depositForm.addEventListener('submit', handleDepositSubmit);
    
    document.addEventListener('click', (e) => {
        const userDropdown = document.querySelector('.user-dropdown');
        const notificationBell = document.querySelector('.notification-bell');
        
        if (userDropdown && !userDropdown.contains(e.target)) {
            userDropdown.classList.remove('active');
        }
        if (notificationBell && !notificationBell.contains(e.target)) {
            notificationBell.classList.remove('active');
        }
    });

    payWithBalanceBtn.addEventListener('click', executePayWithBalance);
    payWithWhatsappBtn.addEventListener('click', executePayWithWhatsapp);

        // --- ربط حدث زر "عرض المزيد" لطرق الدفع ---
    const togglePaymentBtn = document.getElementById('toggle-payment-methods');
    const additionalMethods = document.getElementById('additional-payment-methods');

    if (togglePaymentBtn && additionalMethods) {
        togglePaymentBtn.addEventListener('click', () => {
            // تبديل حالة الإخفاء/الإظهار
            additionalMethods.classList.toggle('hidden');
            togglePaymentBtn.classList.toggle('expanded');

            // تحديث نص وأيقونة الزر
            const isExpanded = togglePaymentBtn.classList.contains('expanded');
            const icon = togglePaymentBtn.querySelector('i');
            const text = togglePaymentBtn.querySelector('span');

            if (isExpanded) {
                icon.className = 'ph-bold ph-caret-up';
                text.textContent = 'إخفاء الطرق الإضافية';
            } else {
                icon.className = 'ph-bold ph-caret-down';
                text.textContent = 'عرض المزيد من الطرق';
            }
        });
    }


    // ... (داخل document.addEventListener('DOMContentLoaded', () => { ...

    // ===================================================================
    // 🎯 8.5. الاستماع لردود الدعم الفني عبر Socket.IO
    // ===================================================================
    if (userInfo && userInfo._id) {
        // إعادة الاتصال بالـ socket مع معرف المستخدم
        const socket = io({ query: { userId: userInfo._id } });

        socket.on('support-reply', (data) => {
            console.log('📨 رسالة دعم جديدة مستلمة من الخادم:', data);

            // التحقق من أن الرسالة تخص المستخدم الحالي
            if (data.userId === userInfo._id) {
                // تشغيل صوت تنبيه
                try {
                    new Audio('/sounds/support_reply.mp3').play().catch(e => console.log("التفاعل مطلوب لتشغيل الصوت."));
                } catch (e) {
                    console.error("فشل تشغيل صوت الرد.");
                }

                // عرض الرسالة في نافذة الدردشة إذا كانت مفتوحة
                const chatWindow = document.getElementById('support-chat-window');
                if (chatWindow && !chatWindow.classList.contains('hidden')) {
                    const messagesContainer = document.getElementById('chat-messages');
                    const messageElement = document.createElement('div');
                    messageElement.className = 'chat-message support'; // رسالة من الدعم
                    messageElement.innerHTML = `<div class="message-bubble">${data.message}</div>`;
                    messagesContainer.appendChild(messageElement);
                    messagesContainer.scrollTop = messagesContainer.scrollHeight; // التمرير للأسفل
                } else {
                    // إذا كانت النافذة مغلقة، أظهر إشعاراً
                    showNotificationAlert({
                        message: `💬 رد جديد من الدعم الفني: "${data.message.substring(0, 30)}..."`
                    });
                }
            }
        });
    }

    
    // --- 8. الاستماع للتحديثات الفورية (Socket.IO) ---
    socket.on('new-service', loadServices);
    socket.on('service-updated', loadServices);
    socket.on('service-deleted', loadServices);

    // 🆕 أضف هذا الاستماع للعروض الجديدة
socket.on('broadcast-notification', (data) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    
    console.log('🔔 إشعار جماعي مستلم:', data);
    
    // 🆕 إذا كان الإشعار عن عرض جديد، جدد العروض
    if (data.message && data.message.includes('🎊')) {
        console.log('🔄 تجديد العروض بسبب إشعار عرض جديد');
        fetchActiveOffers();
    }
    
    // 🆕 أظهر الإشعار لجميع المستخدمين (حتى الزوار)
    showNotificationAlert({
        message: data.message,
        link: data.link || '/'
    });
    
    // جدد الإشعارات إذا كان المستخدم مسجل دخول
    if (userInfo) {
        fetchNotifications();
    }
});

// 🆕 أضف استماع خاص للعروض (اختياري)
socket.on('new-offer', (data) => {
    console.log('🎁 عرض جديد مستلم:', data);
    fetchActiveOffers();
    
    // أظهر إشعار خاص للعروض
    showNotificationAlert({
        message: data.message || '🎊 هناك عرض جديد متاح!',
        link: data.link || '/'
    });
});
    
    // 🔽🔽 استبدل الكود الحالي بهذا الكود المحسّن 🔽🔽

socket.on('deposit-approved', (data) => {
    // تحقق مما إذا كان هذا التحديث يخص المستخدم الحالي
    if (userInfo && userInfo._id === data.userId) {
        console.log('💰 تم استلام تحديث للرصيد، جاري تحديث الواجهة...');
        
        // 1. جلب أحدث بيانات المستخدم من الخادم
        fetch(`/api/auth/me?userId=${userInfo._id}`)
            .then(response => response.json())
            .then(updatedUser => {
                if (updatedUser) {
                    // 2. تحديث البيانات في التخزين المحلي والمتغير العام
                    localStorage.setItem('userInfo', JSON.stringify(updatedUser));
                    userInfo = updatedUser; // تحديث المتغير العام
                    
                    // 3. إعادة بناء واجهة المستخدم بالكامل لعرض الرصيد الجديد
                    updateUIForAuth();
                    
                    console.log('✅ تم تحديث الرصيد في الواجهة بنجاح.');
                }
            })
            .catch(error => {
                console.error('فشل تحديث بيانات المستخدم بعد الموافقة على الإيداع:', error);
            });
    }
});

// 🔼🔼 نهاية الاستبدال 🔼🔼

    
    socket.on('broadcast-notification', (data) => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        
        if (userInfo) {
            console.log('🔔 إشعار جماعي مستلم:', data);
            fetchNotifications();
            showNotificationAlert({
                message: data.message,
                link: data.link
            });
        }
    });
    
    socket.on('new-notification', (data) => {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        
        if (userInfo && data.userId === userInfo._id) {
            console.log('🔔 إشعار جديد مستلم!', data);
            
            try {
                new Audio('/sounds/notification.mp3').play().catch(e => {
                    console.log("يتطلب تفاعل المستخدم لتشغيل الصوت");
                });
            } catch (e) {
                console.log("تعذر تشغيل صوت الإشعار");
            }
            
            fetchNotifications();
            showNotificationAlert(data.notification);
        }
    });

    function showNotificationAlert(notification) {
        const alert = document.createElement('div');
        alert.className = 'notification-alert';
        alert.innerHTML = `
            <div class="alert-content">
                <i class="ph-bold ph-bell-ringing"></i>
                <span>${notification.message}</span>
            </div>
        `;
        
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: var(--purple-gradient);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius-card);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideDown 0.5s ease forwards;
            max-width: 400px;
            text-align: center;
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideUp 0.5s ease forwards';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 500);
        }, 5000);
    }

    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(0); opacity: 1; }
                to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
            }
            .notification-alert .alert-content {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);
    }

    // نظام طي وفتح العروض
function setupOffersToggle() {
    const toggle = document.getElementById('offers-toggle');
    const offersSection = document.getElementById('offers-section');
    
    if (toggle && offersSection) {
        toggle.addEventListener('click', () => {
            offersSection.classList.toggle('collapsed');
            
            // تغيير الأيقونة
            const icon = toggle.querySelector('.toggle-icon');
            if (icon) {
                icon.classList.toggle('ph-caret-down');
                icon.classList.toggle('ph-caret-up');
            }
        });
    }
}

    // --- 9. البدء بتشغيل كل شيء ---
    updateUIForAuth();
    loadServices();
    showWelcomeOffers();
   fetchActiveOffers();
   setupOffersToggle();
   setupSearchSystem();

// وأيضاً استمع لتحديثات العروض
socket.on('broadcast-notification', (data) => {
    // إذا كان الإشعار عن عرض جديد، جدد العروض
    if (data.message && data.message.includes('عرض')) {
        fetchActiveOffers();
    }
});   

// 🆕 event delegation للأزرار الديناميكية
document.addEventListener('click', function(e) {
    // إذا تم النقر على زر تسجيل الدخول في العروض
    if (e.target.classList.contains('offer-login-btn') || 
        e.target.closest('.offer-login-btn')) {
        
        e.preventDefault();
        
        // افتح نافذة التسجيل
        authPopupOverlay.classList.remove('hidden');
        if (loginFormContainer) loginFormContainer.classList.add('hidden');
        if (registerFormContainer) registerFormContainer.classList.remove('hidden');
        
        // تهيئة حقول التسجيل
        setTimeout(() => {
            handleImageSelection();
            setupPasswordStrength();
        }, 100);
    }
});

   // 🆕 أضف event listener لمسح الوقت عند مسح الحقل
quantityInput.addEventListener('input', () => {
    const quantity = parseInt(quantityInput.value, 10);
    
    // 🆕 إذا كان الحقل فارغاً، مسح السعر فوراً
    if (isNaN(quantity) || quantity <= 0) {
        if (priceUpdateTimeout) {
            clearTimeout(priceUpdateTimeout);
        }
        priceDisplay.textContent = '0.00 $';
        return;
    }
    
    updatePrice();
    validateQuantity();
}); 

    // 🆕 🔽 أضف هذا الكود هنا 🔽
    // إضافة event listener لكلمة المرور في نموذج التسجيل
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }
    
    // إضافة event listener لكلمة المرور في نموذج إعادة التعيين
    const resetPasswordInput = document.getElementById('new-password');
    if (resetPasswordInput) {
        resetPasswordInput.addEventListener('input', (e) => {
            // يمكنك إضافة قوة كلمة المرور هنا أيضاً إذا أردت
            updatePasswordStrength(e.target.value);
        });
    }

// ===================================================================
// ===================================================================
// 10. منطق الدردشة الحية (مع دعم الصور)
// ===================================================================
const supportChatToggle = document.getElementById('support-chat-toggle');
const chatWindow = document.getElementById('support-chat-window');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');
const chatLoading = document.getElementById('chat-loading');

// 🎯 عناصر الصور الجديدة
const attachFileBtn = document.getElementById('attach-file-btn');
const chatFileInput = document.getElementById('chat-file-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreviewThumb = document.getElementById('image-preview-thumb');
const removeImageBtn = document.getElementById('remove-image-btn');
let attachedFile = null; // لتخزين الملف المرفق

// دالة الفتح والتحميل (تبقى كما هي)
async function openChatAndLoadHistory() {
    if (!userInfo) {
        window.open('https://wa.me/905367893256', '_blank');
        return;
    }
    chatWindow.classList.remove('hidden');
    chatLoading.classList.remove('hidden');
    chatMessages.innerHTML = '';
    document.getElementById('support-chat-toggle')?.classList.remove('has-new-message');
    localStorage.removeItem('hasUnreadSupportMessage');
    try {
        const response = await fetch('/api/support/chat', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (!response.ok) throw new Error('فشل تحميل المحادثة.');
        const chatHistory = await response.json();
        if (chatHistory && chatHistory.messages && chatHistory.messages.length > 0) {
            chatHistory.messages.forEach(msg => appendMessage(msg.text, msg.sender, msg.timestamp, msg.imageUrl));
        } else {
            appendMessage('مرحباً! كيف يمكننا مساعدتك اليوم؟', 'support');
        }
    } catch (error) {
        appendMessage(`خطأ: ${error.message}`, 'system');
    } finally {
        chatLoading.classList.add('hidden');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 🎯 دالة إرسال الرسالة (محدثة لدعم الصور)
// 🎯 دالة إرسال الرسالة (محدثة لدعم الصور)
async function sendMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText && !attachedFile) return;

    const formData = new FormData();
    formData.append('message', messageText);
    if (attachedFile) {
        formData.append('image', attachedFile);
    }

    // عرض الرسالة فوراً
    const tempImageUrl = attachedFile ? URL.createObjectURL(attachedFile) : null;
    appendMessage(messageText, 'user', new Date(), tempImageUrl);
    
    chatInput.value = '';
    resetAttachment();

    try {
        // 🔽🔽 التعديل هنا: استخدم apiFetch بدلاً من fetch 🔽🔽
        const response = await apiFetch('/api/support/chat', {
            method: 'POST',
            // لا نضع headers هنا، الدالة ستتعامل معها
            body: formData
        });
        // 🔼🔼 نهاية التعديل 🔼🔼

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'فشل إرسال الرسالة');
        }
    } catch (error) {
        appendMessage(`خطأ: ${error.message}`, 'system');
    }
}


// 🎯 دالة إضافة الرسالة (محدثة لعرض الصور)
function appendMessage(text, type, timestamp = new Date(), imageUrl = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;
    const time = new Date(timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    let imageHTML = '';
    if (imageUrl) {
        imageHTML = `<img src="${imageUrl}" alt="صورة مرفقة" onclick="showImageModal('${imageUrl}')">`;
    }

    messageDiv.innerHTML = `
        <div class="message-bubble">
            ${text ? `<div>${text}</div>` : ''}
            ${imageHTML}
        </div>
        <span class="timestamp">${time}</span>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 🎯 دوال التعامل مع إرفاق الصور
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        attachedFile = file;
        imagePreviewThumb.src = URL.createObjectURL(file);
        imagePreviewContainer.classList.remove('hidden');
    }
}

function resetAttachment() {
    attachedFile = null;
    chatFileInput.value = ''; // مسح قيمة حقل الملف
    imagePreviewContainer.classList.add('hidden');
}

// 🎯 دالة عرض الصورة بحجم كامل
function showImageModal(src) {
    const modal = document.createElement('div');
    modal.className = 'image-modal-overlay';
    modal.innerHTML = `<img src="${src}" alt="صورة مكبرة"><button class="close-modal-btn">&times;</button>`;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal-btn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ربط الأحداث
supportChatToggle?.addEventListener('click', openChatAndLoadHistory);
closeChatBtn?.addEventListener('click', () => chatWindow.classList.add('hidden'));
sendChatBtn?.addEventListener('click', sendMessage);
chatInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
attachFileBtn?.addEventListener('click', () => chatFileInput.click());
chatFileInput?.addEventListener('change', handleFileSelect);
removeImageBtn?.addEventListener('click', resetAttachment);

// ابحث عن هذا الكود واستبدله
// ===================================================================
// 🎯 8.5. الاستماع لردود الدعم الفني عبر Socket.IO (النسخة المطورة)
// ===================================================================
if (userInfo && userInfo._id) {
    const socket = io({ query: { userId: userInfo._id } });

    socket.on('support-reply', (data) => {
        console.log('📨 رسالة دعم جديدة مستلمة من الخادم:', data);

        if (data.userId === userInfo._id) {
            try {
                new Audio('/sounds/support_reply.mp3').play().catch(e => console.log("التفاعل مطلوب لتشغيل الصوت."));
            } catch (e) {
                console.error("فشل تشغيل صوت الرد.");
            }

            const chatWindow = document.getElementById('support-chat-window');
            
            if (chatWindow && !chatWindow.classList.contains('hidden')) {
                appendMessage(data.message, 'support', data.timestamp, data.imageUrl);
            } else {
                const supportToggle = document.getElementById('support-chat-toggle');
                if (supportToggle) {
                    supportToggle.classList.add('has-new-message');
                    // 🎯 أضف هذا السطر هنا لتخزين الحالة
                    localStorage.setItem('hasUnreadSupportMessage', 'true');
                }
                
                showNotificationAlert({
                    message: `💬 رد جديد من الدعم الفني: "${(data.message || 'صورة جديدة').substring(0, 30)}..."`
                });
            }
        }
    });
}

// ===================================================================
// 11. منطق الفوتر والأزرار العائمة الجديد
// ===================================================================

// --- زر الرجوع للأعلى ---
const scrollTopBtn = document.getElementById('scroll-top');
window.addEventListener('scroll', () => {
    if (scrollTopBtn) {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    }
});
scrollTopBtn?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// --- روابط الفوتر القانونية ---
document.querySelectorAll('#privacy-policy, #terms-service, #refund-policy, #faq-link').forEach(link => {
    link?.addEventListener('click', (e) => {
        e.preventDefault();
        alert('🚧 هذه الصفحة قيد التطوير وستكون متاحة قريباً!');
    });
});

// --- رابط شحن الرصيد في الفوتر ---
const footerDepositLink = document.getElementById('footer-deposit-link');
footerDepositLink?.addEventListener('click', (e) => {
    e.preventDefault();
    if (userInfo) {
        showDepositPopup();
    } else {
        showAuthPopup('login');
    }
});
    // ===================================================================
    // 15. التحقق من وجود رسائل دعم غير مقروءة عند تحميل الصفحة
    // ===================================================================
    function checkUnreadSupportMessages() {
        const hasUnread = localStorage.getItem('hasUnreadSupportMessage') === 'true';
        const supportToggle = document.getElementById('support-chat-toggle');
        
        if (hasUnread && supportToggle) {
            console.log('📥 تم العثور على رسالة دعم غير مقروءة من الجلسة السابقة.');
            supportToggle.classList.add('has-new-message');
        }
    }

    // استدعاء الدالة عند بدء تشغيل السكربت
    checkUnreadSupportMessages();
 
// 🔼 هذا هو نهاية DOMContentLoaded 🔼
});   // ← هذي غالباً ناقصة عندك
