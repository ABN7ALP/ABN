// ==========================================================
// 🚀 Auth-Fetch: نظام مركزي لإرسال طلبات API مؤمنة
// ==========================================================

let csrfToken = null;

/**
 * دالة لجلب توكن CSRF عند الحاجة.
 */
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token');
        if (!response.ok) throw new Error('Failed to fetch CSRF token');
        const data = await response.json();
        csrfToken = data.csrfToken;
        console.log('✅ CSRF Token fetched successfully!');
    } catch (error) {
        console.error('❌ Critical: Could not fetch CSRF token.', error);
        document.body.innerHTML = '<h1>حدث خطأ حرج في الأمان. يرجى تحديث الصفحة.</h1>';
    }
}

/**
 * دالة ذكية لإرسال طلبات API مؤمنة (تدعم JSON و FormData)
 * وتضيف توكن المصادقة و CSRF تلقائياً.
 * @param {string} url - رابط الـ API
 * @param {object} options - خيارات الطلب (مثل method, body)
 * @returns {Promise<Response>}
 */
async function apiFetch(url, options = {}) {
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    if (!csrfToken) {
        throw new Error('CSRF token is missing. Cannot make the request.');
    }

    const authToken = localStorage.getItem('token');
    const headers = { ...options.headers, 'CSRF-Token': csrfToken };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }


    const currentLng = localStorage.getItem('i18nextLng') || 'ar';
    headers['Accept-Language'] = currentLng;

    // تحديد نوع المحتوى تلقائياً
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const secureOptions = { ...options, headers };

    let response = await fetch(url, secureOptions);

    // إعادة المحاولة عند فشل توكن CSRF
    if (response.status === 403) {
        console.warn('CSRF token validation failed. Refetching token and retrying...');
        await fetchCsrfToken(); 
        secureOptions.headers['CSRF-Token'] = csrfToken;
        response = await fetch(url, secureOptions); 
    }

    // 🚀🚀 التحسين الأهم هنا 🚀🚀
    // التعامل مع خطأ 401 (غير مصرح به)
    if (response.status === 401 && url.includes('/api/')) {
        // لا تقم بتسجيل الخروج مباشرة إذا كان الطلب لتسجيل الدخول
        // لأن خطأ 401 هنا يعني "كلمة مرور خاطئة"
        if (url.endsWith('/api/auth/login')) {
            // لا تفعل شيئاً هنا، دع الكود الذي استدعى الدالة يتعامل مع الخطأ
        } else {
            // لجميع طلبات API الأخرى، خطأ 401 يعني أن الجلسة منتهية
            console.error('Authentication failed (401). Logging out user.');
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            alert('انتهت صلاحية جلستك. سيتم تسجيل خروجك.');
            window.location.href = '/index.html#login';
        }
    }

    return response;
}

// استدعاء أولي لجلب التوكن عند تحميل السكربت
fetchCsrfToken();
