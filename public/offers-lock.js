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
        // تأخير التنفيذ حتى يتم تحميل الـ DOM
        setTimeout(() => {
            const offersSection = document.getElementById('offers-section');
            
            // 🔒 تطبيق القفل فقط إذا كان المستخدم أدمن وليس المطور
            if (offersSection && this.isAdmin && !this.isDeveloper && !this.isUnlocked) {
                this.showLockScreen(offersSection);
            }
        }, 100);
    }

    showLockScreen(offersSection) {
        // حفظ المحتوى الأصلي للقسم
        const originalContent = offersSection.innerHTML;
        
        // إضافة القفل مع خلفية شفافة
        offersSection.innerHTML = `
            <div class="lock-overlay" style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                z-index: 100;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: var(--radius-card);
            ">
                <div class="lock-content" style="
                    background: white;
                    padding: 3rem;
                    border-radius: var(--radius-card);
                    box-shadow: var(--shadow-lg);
                    text-align: center;
                    max-width: 500px;
                    border: 2px solid var(--purple-main);
                ">
                    <div class="lock-icon" style="font-size: 4rem; color: var(--purple-main); margin-bottom: 1rem;">
                        <i class="ph-bold ph-lock"></i>
                    </div>
                    
                    <h2 style="color: var(--text-dark); margin-bottom: 1rem; font-size: 1.8rem;">
                        الميزة مقفولة 🔒
                    </h2>
                    
                    <p style="color: var(--text-light); margin-bottom: 2rem; font-size: 1.1rem; line-height: 1.6;">
                        قسم العروض المتقدمة مقفل. يرجى دفع <strong style="color: var(--purple-main);">10$</strong> 
                        لفتح هذه الميزة الإضافية في لوحة التحكم.
                    </p>
                    
                    <div class="payment-info" style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        margin: 2rem 0;
                        align-items: start;
                    ">
                        <div class="qr-code" style="text-align: center;">
                            <h4 style="color: var(--text-dark); margin-bottom: 1rem;">📱 مسح الباركود</h4>
                            <!-- 🔽 ضع رابط صورة الباركود هنا -->
                            <img src="https://your-domain.com/path-to-qr-code.png" 
                                 alt="QR Code للدفع"
                                 style="max-width: 200px; border-radius: var(--radius-input); border: 2px solid var(--gray-border);">
                        </div>
                        
                        <div class="payment-instructions" style="text-align: right;">
                            <h4 style="color: var(--text-dark); margin-bottom: 1rem;">📋 تعليمات الدفع:</h4>
                            <ol style="text-align: right; padding-right: 1rem; color: var(--text-light); line-height: 1.8;">
                                <li>ادفع مبلغ 10$ عبر الباركود</li>
                                <li>احتفظ بإيصال الدفع</li>
                                <li>تواصل مع المطور على الواتساب</li>
                                <li>سيتم فتح الميزة خلال 24 ساعة</li>
                            </ol>
                        </div>
                    </div>

                    <div class="contact-info" style="margin: 2rem 0;">
                        <a href="https://wa.me/905367893256?text=مرحبا، أريد فتح قسم العروض في لوحة التحكم" 
                           class="pill-button primary-button" 
                           target="_blank"
                           style="text-decoration: none;">
                            <i class="ph-bold ph-whatsapp-logo"></i>
                            تواصل مع المطور على الواتساب
                        </a>
                    </div>

                    ${this.isDeveloper ? `
                        <div class="developer-panel" style="margin-top: 2rem; padding-top: 2rem; border-top: 2px dashed var(--gray-border);">
                            <h4 style="color: var(--success-green); margin-bottom: 1rem;">👨‍💻 لوحة المطور</h4>
                            <button id="unlock-offers-btn" class="pill-button success-button">
                                <i class="ph-bold ph-key"></i>
                                فتح قسم العروض
                            </button>
                            <button id="reset-lock-btn" class="pill-button secondary-button" style="margin-top: 0.5rem;">
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

// جعل النظام متاحاً globally
window.OffersLockSystem = OffersLockSystem;
