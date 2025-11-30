// offers-lock.js - نظام قفل قسم العروض (للمدير فقط)

class OffersLockSystem {
    constructor() {
        this.isUnlocked = localStorage.getItem('offersUnlocked') === 'true';
        this.isDeveloper = this.checkDeveloperRole();
        this.isAdmin = this.checkAdminRole();
        this.init();
    }

    checkDeveloperRole() {
        // 🔧 غير هذا الرقم إلى رقم المطور الحقيقي (رقمك)
        const developerUserId = '6921d6a914a8ff08372c731a'; 
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        
        return userInfo && userInfo._id === developerUserId;
    }

    checkAdminRole() {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        return userInfo && userInfo.isAdmin === true;
    }

    init() {
        setTimeout(() => {
            const offersSection = document.getElementById('offers-section');
            
            // 🔒 تطبيق القفل فقط إذا كان المستخدم أدمن وليس المطور
            if (offersSection && this.isAdmin && !this.isDeveloper && !this.isUnlocked) {
                this.showLockScreen(offersSection);
            }
        }, 100);
    }

    showLockScreen(offersSection) {
        const originalContent = offersSection.innerHTML;
        
        offersSection.innerHTML = `
            <div class="lock-overlay">
                <div class="lock-content">
                    <div class="lock-icon">
                        <i class="ph-bold ph-lock"></i>
                    </div>
                    
                    <h2>الميزة مقفولة 🔒</h2>
                    
                    <p>
                        قسم العروض المتقدمة مقفل. يرجى دفع <strong>10$</strong> 
                        لفتح هذه الميزة الإضافية في لوحة التحكم.
                    </p>
                    
                    <div class="payment-info">
                        <div class="qr-code">
                            <h4>📱 مسح الباركود</h4>
                            <!-- ضع رابط صورة الباركود هنا -->
                            <img src="https://your-domain.com/path-to-qr-code.png" 
                                 alt="QR Code للدفع">
                        </div>
                        
                        <div class="payment-instructions">
                            <h4>📋 تعليمات الدفع:</h4>
                            <ol>
                                <li>ادفع مبلغ 10$ عبر الباركود</li>
                                <li>احتفظ بإيصال الدفع</li>
                                <li>تواصل مع المطور على الواتساب</li>
                                <li>سيتم فتح الميزة خلال 24 ساعة</li>
                            </ol>
                        </div>
                    </div>

                    <div class="contact-info">
                        <a href="https://wa.me/رقم_واتسابك?text=مرحبا، أريد فتح قسم العروض في لوحة التحكم" 
                           class="pill-button primary-button" 
                           target="_blank">
                            <i class="ph-bold ph-whatsapp-logo"></i>
                            تواصل مع المطور على الواتساب
                        </a>
                    </div>

                    <!-- 🎯 هذه الأزرار تظهر للمطور فقط -->
                    ${this.isDeveloper ? `
                        <div class="developer-panel">
                            <h4>👨‍💻 لوحة المطور</h4>
                            <button id="unlock-offers-btn" class="pill-button success-button">
                                <i class="ph-bold ph-key"></i>
                                فتح قسم العروض للجميع
                            </button>
                            <button id="reset-lock-btn" class="pill-button secondary-button">
                                <i class="ph-bold ph-arrow-counter-clockwise"></i>
                                إعادة تعيين القفل
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- المحتوى الأصلي (مقفل) -->
            <div style="opacity: 0.3; pointer-events: none;">
                ${originalContent}
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // زر فتح القسم (للمطور فقط)
        document.getElementById('unlock-offers-btn')?.addEventListener('click', () => {
            this.unlockOffers();
        });

        // زر إعادة التعيين (للمطور فقط)
        document.getElementById('reset-lock-btn')?.addEventListener('click', () => {
            this.resetLock();
        });
    }

    unlockOffers() {
        localStorage.setItem('offersUnlocked', 'true');
        alert('✅ تم فتح قسم العروض بنجاح!');
        location.reload();
    }

    resetLock() {
        localStorage.removeItem('offersUnlocked');
        alert('🔄 تم إعادة تعيين القفل!');
        location.reload();
    }

    checkAccess() {
        // السماح بالوصول إذا كان المطور أو تم فتح القفل
        return this.isDeveloper || this.isUnlocked;
    }
}

window.OffersLockSystem = OffersLockSystem;
