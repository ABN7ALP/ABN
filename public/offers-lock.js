// offers-lock.js - نظام قفل قسم العروض (لجميع الأدمن)

class OffersLockSystem {
    constructor() {
        console.log('🔄 OffersLockSystem Constructor Called');
        
        this.isUnlocked = localStorage.getItem('offersUnlocked') === 'true';
        this.isDeveloper = this.checkDeveloperRole();
        this.isAdmin = this.checkAdminRole();
        
        console.log('📊 Initial State:', {
            isUnlocked: this.isUnlocked,
            isDeveloper: this.isDeveloper,
            isAdmin: this.isAdmin
        });
        
        this.init();
    }

    checkDeveloperRole() {
        const developerUserId = '6921d6a914a8ff08372c731a'; 
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        
        const isDev = userInfo && userInfo._id === developerUserId;
        console.log('👨‍💻 Developer Check Result:', isDev);
        
        return isDev;
    }

    checkAdminRole() {
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        const isAdm = userInfo && userInfo.isAdmin === true;
        console.log('👑 Admin Check Result:', isAdm);
        
        return isAdm;
    }

    init() {
        console.log('🚀 OffersLockSystem Init Started');
        
        setTimeout(() => {
            const offersSection = document.getElementById('offers-section');
            console.log('🎯 Offers Section Element:', offersSection);
            
            if (!offersSection) {
                console.log('❌ Offers section not found!');
                return;
            }
            
            console.log('🔍 Final Check Before Lock:', {
                sectionExists: !!offersSection,
                isAdmin: this.isAdmin,
                isDeveloper: this.isDeveloper,
                isUnlocked: this.isUnlocked,
                shouldShowLock: this.isAdmin && !this.isUnlocked // ⬅️ التغيير هنا
            });
            
            // 🔒 الشرط الجديد: إذا كان أدمن ولم يفتح القفل
            if (this.isAdmin && !this.isUnlocked) {
                console.log('🎨 Showing Lock Screen for Admin');
                this.showLockScreen(offersSection);
            } else {
                console.log('🔓 No Lock Screen - Admin has access');
            }
        }, 100);
    }

    showLockScreen(offersSection) {
        console.log('🎨 Rendering Lock Screen Content');
        
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
                            <img src="https://via.placeholder.com/200x200?text=QR+Code+Here" 
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
                        <a href="https://wa.me/905367893256?text=مرحبا، أريد فتح قسم العروض في لوحة التحكم" 
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
                            <p>أنت مسجل كمطور - يمكنك التحكم في القفل</p>
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

        console.log('✅ Lock Screen Rendered');
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners for developer buttons');
        
        const unlockBtn = document.getElementById('unlock-offers-btn');
        const resetBtn = document.getElementById('reset-lock-btn');
        
        console.log('🔍 Developer Buttons Found:', {
            unlockBtn: unlockBtn,
            resetBtn: resetBtn
        });

        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => {
                console.log('🔑 Unlock button clicked');
                this.unlockOffers();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                console.log('🔄 Reset button clicked');
                this.resetLock();
            });
        }
    }

    unlockOffers() {
        localStorage.setItem('offersUnlocked', 'true');
        alert('✅ تم فتح قسم العروض بنجاح!');
        console.log('🔓 Section unlocked globally');
        location.reload();
    }

    resetLock() {
        localStorage.removeItem('offersUnlocked');
        alert('🔄 تم إعادة تعيين القفل!');
        console.log('🔒 Section lock reset');
        location.reload();
    }

    checkAccess() {
        const access = this.isUnlocked;
        console.log('🔐 Access Check Result:', access);
        return access;
    }
}

window.OffersLockSystem = OffersLockSystem;
