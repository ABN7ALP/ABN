<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سجل الطلبات - SMM Engine</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="/css/style.css">
</head>
<body class="bg-light">

    <!-- Navbar (نفس الشريط العلوي المستخدم في لوحة التحكم) -->
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div class="container">
            <a class="navbar-brand" href="/dashboard">SMM Engine</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">
                    <li class="nav-item">
                        <a class="nav-link" href="/dashboard">طلب جديد</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="/orders">طلباتي</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/add-funds">شحن الرصيد</a>
                    </li>
                </ul>
                <ul class="navbar-nav">
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                            <i class="fas fa-user-circle me-1"></i>
                            مرحباً، <%= user.name %>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="/profile">الملف الشخصي</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="/auth/logout">تسجيل الخروج</a></li>
                        </ul>
                    </li>
                     <li class="nav-item ms-2">
                        <a class="btn btn-success">
                            <i class="fas fa-wallet me-1"></i>
                            الرصيد: $<%= user.balance.toFixed(2) %>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Orders Table -->
    <div class="container mt-4">
        <div class="card">
            <div class="card-header">
                <h4 class="mb-0">سجل الطلبات</h4>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover text-center">
                        <thead class="table-dark">
                            <tr>
                                <th>#</th>
                                <th>الخدمة</th>
                                <th>الرابط</th>
                                <th>الكمية</th>
                                <th>التكلفة</th>
                                <th>التاريخ</th>
                                <th>الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <% if (orders.length > 0) { %>
                                <% orders.forEach((order, index) => { %>
                                    <tr>
                                        <td><%= index + 1 %></td>
                                        <td><%= order.service.name %></td>
                                        <td style="max-width: 200px; overflow-wrap: break-word;"><a href="<%= order.link %>" target="_blank"><%= order.link %></a></td>
                                        <td><%= order.quantity.toLocaleString() %></td>
                                        <td>$<%= order.charge.toFixed(2) %></td>
                                        <td><%= new Date(order.createdAt).toLocaleDateString('ar-EG') %></td>
                                        <td>
                                            <span class="badge <%= getStatusBadge(order.status) %>">
                                                <%= translateStatus(order.status) %>
                                            </span>
                                        </td>
                                    </tr>
                                <% }) %>
                            <% } else { %>
                                <tr>
                                    <td colspan="7" class="text-center py-4">لا يوجد طلبات لعرضها حتى الآن.</td>
                                </tr>
                            <% } %>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
