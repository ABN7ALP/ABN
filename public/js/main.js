
document.addEventListener('DOMContentLoaded', () => {
    const platformSelect = document.getElementById('platform-select');
    const serviceSelect = document.getElementById('service-select');
    const quantityInput = document.getElementById('quantity');
    const linkInput = document.getElementById('link');
    const minOrderSpan = document.getElementById('min-order');
    const maxOrderSpan = document.getElementById('max-order');
    const chargeSpan = document.getElementById('charge');
    const serviceDetailsDiv = document.getElementById('service-details');
    const orderForm = document.getElementById('create-order-form');

    if (!orderForm) return; // لا تنفذ الكود إذا لم نكن في صفحة الداشبورد

    function updateServiceList() {
        const selectedPlatform = platformSelect.value;
        const filteredServices = servicesData.filter(service => service.platform === selectedPlatform);

        serviceSelect.innerHTML = '<option selected disabled>-- اختر خدمة --</option>';
        filteredServices.forEach(service => {
            const option = document.createElement('option');
            option.value = service._id;
            option.textContent = `${service.name} - ($${service.pricePer1000} لكل 1000)`;
            serviceSelect.appendChild(option);
        });
        serviceSelect.disabled = false;
        resetOrderDetails();
    }

    function updateOrderDetails() {
        const selectedServiceId = serviceSelect.value;
        const selectedService = servicesData.find(service => service._id === selectedServiceId);

        if (selectedService) {
            minOrderSpan.textContent = selectedService.minOrder.toLocaleString();
            maxOrderSpan.textContent = selectedService.maxOrder.toLocaleString();
            quantityInput.min = selectedService.minOrder;
            quantityInput.max = selectedService.maxOrder;
            quantityInput.disabled = false;
            serviceDetailsDiv.textContent = `الوصف: ${selectedService.name}`;
            serviceDetailsDiv.classList.remove('d-none');
        }
        calculateCost();
    }

    function calculateCost() {
        const selectedServiceId = serviceSelect.value;
        const selectedService = servicesData.find(service => service._id === selectedServiceId);
        const quantity = parseInt(quantityInput.value) || 0;

        if (selectedService && quantity > 0) {
            const cost = (quantity / 1000) * selectedService.pricePer1000;
            chargeSpan.textContent = `$${cost.toFixed(4)}`;
        } else {
            chargeSpan.textContent = '$0.00';
        }
    }

    function resetOrderDetails() {
        quantityInput.value = '';
        quantityInput.disabled = true;
        minOrderSpan.textContent = '0';
        maxOrderSpan.textContent = '0';
        serviceDetailsDiv.classList.add('d-none');
        calculateCost();
    }

    platformSelect.addEventListener('change', updateServiceList);
    serviceSelect.addEventListener('change', updateOrderDetails);
quantityInput.addEventListener('input', calculateCost);

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const serviceId = serviceSelect.value;
        const link = linkInput.value;
        const quantity = quantityInput.value;

        Swal.fire({
            title: 'هل أنت متأكد؟',
            html: `سيتم خصم <strong>${chargeSpan.textContent}</strong> من رصيدك.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، قم بالتأكيد!',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'جاري معالجة طلبك...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const response = await fetch('/dashboard/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ serviceId, link, quantity }),
                    });
                    const data = await response.json();

                    if (data.success) {
                        Swal.fire('نجاح!', data.message, 'success');
                        const balanceDisplay = document.getElementById('balance-display');
                        if (balanceDisplay) {
                            balanceDisplay.innerHTML = `<i class="fas fa-wallet me-1"></i> الرصيد: $${data.newBalance.toFixed(2)}`;
                        }
                        orderForm.reset();
                        resetOrderDetails();
                        serviceSelect.innerHTML = '<option selected disabled>-- اختر خدمة --</option>';
                        serviceSelect.disabled = true;
                    } else {
                        Swal.fire('خطأ!', data.message, 'error');
                    }
                } catch (error) {
                    Swal.fire('خطأ فادح!', 'لا يمكن الاتصال بالخادم.', 'error');
                }
            }
        });
    });
});
