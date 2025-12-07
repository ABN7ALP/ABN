// src/config/socket.js

const { Server } = require("socket.io");
const { rateLimit } = require("socket.io-rate-limit");

let io;

function initSocket(httpServer) {
    // 🎯 قائمة النطاقات المسموح بها (تم تحديثها)
    const allowedOrigins = [
        "https://abn-production-cbae.up.railway.app", // ✅ تم إضافة نطاقك الجديد هنا
        "https://bae.up.railway.app",                 // النطاق القديم (من الجيد إبقاؤه)
        "http://localhost:3000",                     // نطاق التطوير المحلي
        "http://127.0.0.1:5500"                      // نطاق Live Server في VS Code
    ];

    io = new Server(httpServer, {
        cors: {
            origin: function (origin, callback) {
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    console.error(`❌ CORS Error: Origin ${origin} not allowed.`); // 🎯 إضافة سجل خطأ أوضح
                    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                    callback(new Error(msg), false);
                }
            },
            methods: ["GET", "POST"]
        }
    });

     // ==========================================================
    // 🛡️ Socket.IO Rate Limiting Middleware
    // ==========================================================
    io.use(rateLimit({
        // 10 ثوانٍ هي فترة النافذة الزمنية
        window: 10000, 
        // 15 حدثاً كحد أقصى لكل مستخدم خلال هذه الفترة
        limit: 15, 
        // 🎯 الأحداث التي سيتم تطبيق الحماية عليها.
        // أضف أي حدث مستقبلي ترسله من العميل إلى الخادم هنا.
        events: [
            "sendMessage", // هذا مثال لحدث إرسال رسالة دعم
            // "another_event",
            // "some_other_action"
        ]
    }));

    io.on('connection', (socket) => {
        console.log('✅ A user connected from allowed origin:', socket.handshake.headers.origin);
        
        socket.on("rate-limit", (payload) => {
            console.warn(`Socket Rate Limit Exceeded: User ${socket.id} tried to send event '${payload.event}' too fast.`);
            // يمكنك إرسال إشعار للعميل إذا أردت
            socket.emit("error", { message: "لقد تجاوزت الحد المسموح به من الطلبات، يرجى التمهل." });
        });


        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} joined room ${userId}`);
        }
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}

function getIo() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}

module.exports = { initSocket, getIo };
