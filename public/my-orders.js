document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const ordersTbody = document.getElementById('my-orders-tbody');
    const loadingSpinner = document.getElementById('my-orders-loading');
    const mainNav = document.getElementById('main-nav');
    let userInfo = null;

    // --- Auth UI Functions (Copied from app.js for consistency) ---
    function updateUIForAuth() {
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            userInfo = JSON.parse(storedUser);
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
            // Add event listeners for dropdown
            const dropdown = mainNav.querySelector('.user-dropdown');
            dropdown.addEventListener('click', (e) => {
                if (e.target.closest('.user-dropdown-toggle')) {
                    dropdown.classList.toggle('active');
                }
            });
            document.getElementById('logout-btn').addEventListener('click', () => {
                localStorage.removeItem('userInfo');
                window.location.href = '/';
            });
            // Add other listeners like 'add-balance-link' if needed
        } else {
            // If not logged in, redirect to home to handle login popup
            window.location.href = '/';
        }
    }

    // --- Fetch and Render Orders ---
    async function fetchMyOrders() {
        if (!userInfo || !userInfo._id) return;

        loadingSpinner.style.display = 'block';
        ordersTbody.innerHTML = '';

        try {
            const response = await fetch(`/api/orders/my-orders?userId=${userInfo._id}`);
            if (!response.ok) throw new Error('فشل جلب الطلبات. حاول تحديث الصفحة.');
            const orders = await response.json();
            renderMyOrders(orders);
        } catch (error) {
            ordersTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">${error.message}</td></tr>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function renderMyOrders(orders) {
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">ليس لديك أي طلبات سابقة.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = document.createElement('tr');
            const statusClass = `status-${order.status.replace(/\s/g, '-')}`;
            row.innerHTML = `
                <td data-label="الخدمة">${order.service} (${order.platform})</td>
                <td data-label="الكمية">${order.quantity.toLocaleString()}</td>
                <td data-label="السعر">${order.price.toFixed(2)} $</td>
                <td data-label="تاريخ الطلب">${new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                <td data-label="الحالة"><span class="status ${statusClass}">${order.status}</span></td>
            `;
            ordersTbody.appendChild(row);
        });
    }

    // --- Socket.IO Listener ---
    socket.on('order-status-updated', (updatedOrder) => {
        if (userInfo && updatedOrder.user === userInfo._id) {
            fetchMyOrders();
        }
    });

    // --- Initial Load ---
    updateUIForAuth();
    fetchMyOrders();
});
