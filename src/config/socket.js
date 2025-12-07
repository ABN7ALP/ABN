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
        // 🔽🔽 التعديلات الأهم هنا 🔽🔽
        path: "/socket.io/", // 1. تحديد المسار بشكل صريح
        cors: {
            origin: function (origin, callback) {
                // السماح بالطلبات التي لا تحتوي على origin (مثل تطبيقات الموبايل أو Postman)
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    console.error(`❌ CORS Error: Origin ${origin} not allowed.`);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'] // 2. تحديد طرق الاتصال بشكل صريح
        // 🔼🔼 نهاية التعديلات 🔼🔼
    });

    // تطبيق حماية Rate Limiting
    io.use(rateLimit({
        window: 10000, 
        limit: 15,
        // لا نضع أي أحداث هنا الآن، لكنه جاهز للمستقبل
        events: [] 
    }));

    io.on('connection', (socket) => {
        console.log('✅ A user connected via Socket.IO. Transport:', socket.conn.transport.name);
        
        socket.on("rate-limit", (payload) => {
            console.warn(`Socket Rate Limit Exceeded for user ${socket.id}`);
            socket.emit("error", { message: "لقد تجاوزت الحد المسموح به من الطلبات، يرجى التمهل." });
        });

        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(userId);
            console.log(`User ${userId} joined their dedicated room.`);
        }
        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${socket.id}. Reason: ${reason}`);
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
