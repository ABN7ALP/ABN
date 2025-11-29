// offers-lock.js - نظام قفل قسم العروض

class OffersLockSystem {
    constructor() {
        this.isUnlocked = localStorage.getItem('offersUnlocked') === 'true';
        this.isDeveloper = this.checkDeveloperRole();
        this.init();
    }

    checkDeveloperRole() {
        // 🔧 غير هذا الرقم إلى رقم المطور الحقيقي
        const developerUserId = '6921d6a914a8ff08372c731a'; 
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        
        return userInfo && userInfo._id === developerUserId;
    }

    init() {
        // تأخير التنفيذ حتى يتم تحميل الـ DOM
        setTimeout(() => {
            const offersSection = document.getElementById('offers-section');
            if (offersSection && !this.isUnlocked && !this.isDeveloper) {
                this.showLockScreen(offersSection);
            }
        }, 100);
    }

    showLockScreen(offersSection) {
        offersSection.innerHTML = `
            <div class="lock-screen">
                <div class="lock-content">
                    <div class="lock-icon">
                        <i class="ph-bold ph-lock"></i>
                    </div>
                    <h2>الميزة مقفلة 🔒</h2>
                    <p>لقسم العروض المتقدمة، يرجى دفع <strong>10$</strong> لفتح هذه الميزة</p>
                    
                    <div class="payment-info">
                        <div class="qr-code">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/905367893256?text=مرحبا، أريد فتح قسم العروض في المتجر - ${Date.now()}" 
                                 alt="QR Code للدفع">
                        </div>
                        <div class="payment-instructions">
                            <h4>📋 تعليمات الدفع:</h4>
                            <ol>
                                <li>امسح QR Code أو ادفع 10$</li>
                                <li>احتفظ بإيصال الدفع</li>
                                <li>تواصل مع المطور على الواتساب</li>
                                <li>سنقوم بفتح الميزة خلال 24 ساعة</li>
                            </ol>
                        </div>
                    </div>

                    <div class="contact-info">
                        <a href="https://wa.me/905367893256?text=مرحبا، أريد فتح قسم العروض في المتجر" 
                           class="pill-button primary-button" target="_blank">
                            <i class="ph-bold ph-whatsapp-logo"></i>
                            تواصل مع المطور على الواتساب
                        </a>
                    </div>

                    ${this.isDeveloper ? `
                        <div class="developer-panel">
                            <h4>👨‍💻 لوحة المطور</h4>
                            <button id="unlock-offers-btn" class="pill-button success-button">
                                <i class="ph-bold ph-key"></i>
                                فتح قسم العروض للجميع
                            </button>
                            <button id="reset-lock-btn" class="pill-button secondary-button" style="margin-top: 0.5rem;">
                                <i class="ph-bold ph-arrow-counter-clockwise"></i>
                                إعادة تعيين القفل
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // زر فتح القسم (للمطور)
        document.getElementById('unlock-offers-btn')?.addEventListener('click', () => {
            this.unlockOffers();
        });

        // زر إعادة التعيين (للمطور)
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
        return this.isUnlocked || this.isDeveloper;
    }
}

// جعل النظام متاحاً globally
window.OffersLockSystem = OffersLockSystem;
