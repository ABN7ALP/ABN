document.addEventListener('DOMContentLoaded', () => {
    // --- 1. إعداد الاتصال الفوري (Socket.IO) ---
    const socket = io();

    // --- المتغيرات العامة ---
    let servicesData = {}, currentPlatform = null, userInfo = null, currentOrderData = {};

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
            mainNav.innerHTML = `
                <div class="user-dropdown">
                    <div class="user-dropdown-toggle">
                        <i class="ph-bold ph-user-circle"></i>
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
            const response = await fetch('/api/auth/login', { 
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
        
        const response = await fetch('/api/auth/register', { 
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
        
        const response = await fetch('/api/auth/verify-email', {
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
            const response = await fetch('/api/auth/send-verification', {
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
        const response = await fetch('/api/auth/forgot-password', {
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
            const response = await fetch(`/api/auth/me?userId=${userInfo._id}`);
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
        
        const response = await fetch('/api/auth/reset-password', {
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
        let detailsHTML = '';
        switch (selectedMethod) {
            case 'bank': 
                detailsHTML = `<p>يرجى تحويل المبلغ إلى الحساب التالي:</p><p>الاسم: <span>BESSAR</span></p><p>رقم الحساب (IBAN): <span>TR9785431312751367319</span></p>`; 
                break;
            case 'sham': 
                detailsHTML = `<p>يرجى مسح الباركود التالي والدفع عبر شام كاش:</p><img src="https://i.ibb.co/GvXw59R/bfa34fae23d4f3b4089e6d615bbd07d7.png" alt="Sham Cash QR Code">`; 
                break;
            case 'whatsapp': 
                detailsHTML = `<p>للحوالة عبر مكتب، يرجى التواصل معنا عبر واتساب للحصول على التفاصيل. بعد إتمام الحوالة، قم برفع صورة الإيصال هنا.</p>`; 
                break;
        }
        paymentDetailsContainer.innerHTML = detailsHTML;
        paymentDetailsContainer.classList.remove('hidden');
    }

    async function handleDepositSubmit(event) {
        event.preventDefault();
        depositFormResponse.textContent = 'جاري إرسال الطلب...';
        depositFormResponse.className = 'form-message';
        const receiptFile = document.getElementById('deposit-receipt').files[0];
        const selectedMethod = document.querySelector('.payment-method-btn.active');
        
        if (!selectedMethod) { 
            depositFormResponse.textContent = 'الرجاء اختيار طريقة الدفع.'; 
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
            
            const response = await fetch('/api/deposits', { 
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
            const response = await fetch('/api/services');
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

    function getPlatformIcon(platform) {
        const p = platform.toLowerCase().trim();
        if (p.includes('instagram') || p.includes('انستغرام') || p.includes('انستا')) return 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png';
        if (p.includes('tiktok') || p.includes('تيك توك')) return 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg';
        if (p.includes('twitter') || p.includes('تويتر') || p === 'x') return 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg';
        if (p.includes('facebook') || p.includes('فيس بوك') || p.includes('فيس')) return 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg';
        if (p.includes('youtube') || p.includes('يوتيوب')) return 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg';
        if (p.includes('telegram') || p.includes('تلغرام')) return 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg';
        if (p.includes('snapchat') || p.includes('سناب شات')) return 'https://upload.wikimedia.org/wikipedia/en/c/c4/Snapchat_logo.svg';
        if (p.includes('threads') || p.includes('ثريدز')) return 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Threads_app_icon.svg';
        
        try {
            const initial = encodeURIComponent(platform.charAt(0).toUpperCase());
            return `https://ui-avatars.com/api/?name=${initial}&background=random&size=50&color=fff`;
        } catch (e) { 
            return ''; 
        }
    }

    function getPlatformValidation(platform) {
        const p = platform.toLowerCase().trim();
        if (p.includes('instagram') || p.includes('انستغرام') || p.includes('انستا')) return /instagram\.com/;
        if (p.includes('tiktok') || p.includes('تيك توك')) return /tiktok\.com/;
        if (p.includes('twitter') || p.includes('تويتر') || p === 'x') return /(twitter|x)\.com/;
        if (p.includes('facebook') || p.includes('فيس بوك') || p.includes('فيس')) return /facebook\.com/;
        if (p.includes('youtube') || p.includes('يوتيوب')) return /(youtube\.com|youtu\.be)/;
        if (p.includes('telegram') || p.includes('تلغرام')) return /(telegram\.me|t\.me)/;
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
        const iconName = platform.toLowerCase().replace(/\s/g, '');
        popupIcon.className = `ph-bold ph-${iconName}-logo`;
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

    function updatePrice() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        if (!selectedOption) return;
        
        const pricePer1000 = parseFloat(selectedOption.dataset.price);
        const quantity = parseInt(quantityInput.value, 10);
        
        if (isNaN(quantity) || quantity <= 0) { 
            priceDisplay.textContent = '0.00 $'; 
            return; 
        }
        
        const totalPrice = (quantity / 1000) * pricePer1000;
        priceDisplay.textContent = `${totalPrice.toFixed(2)} $`;
        
        priceDisplay.style.transform = 'scale(1.1)';
        setTimeout(() => {
            priceDisplay.style.transform = 'scale(1)';
        }, 200);
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
        
        currentOrderData = { 
            platform: currentPlatform, 
            service: serviceSelect.value, 
            link: linkInput.value, 
            quantity: parseInt(quantityInput.value, 10), 
            price: parseFloat(priceDisplay.textContent.replace(' $', '')), 
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
    }

    async function executePayWithBalance() {
        try {
            const response = await fetch('/api/orders/pay-with-balance', { 
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
            await fetch('/api/orders', { 
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
            const response = await fetch('/api/notifications', {
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
            const response = await fetch('/api/notifications/mark-read', {
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

    // --- 8. الاستماع للتحديثات الفورية (Socket.IO) ---
    socket.on('new-service', loadServices);
    socket.on('service-updated', loadServices);
    socket.on('service-deleted', loadServices);
    
    socket.on('deposit-approved', (data) => {
        if (userInfo && userInfo._id === data.userId) {
            refreshUserData();
        }
    });
    
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

        // --- 9. البدء بتشغيل كل شيء ---
    updateUIForAuth();
    loadServices();

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
// 🆕 🔼 نهاية الإضافة 🔼
});
// 🔼 هذا هو نهاية DOMContentLoaded 🔼
