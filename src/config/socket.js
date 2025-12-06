// src/config/socket.js

const { Server } = require("socket.io");

let io;

function initSocket(httpServer) {
    // 🎯 قائمة النطاقات المسموح بها (تم تحديثها)
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        "https://abn-production-cbae.up.railway.app"
        // فقط نطاق الإنتاج
    ] 
    : [
        "http://localhost:3000",
        "https://bae.up.railway.app",
        "http://127.0.0.1:5500"
        // نطاقات التطوير فقط
    ];

// ✅ أضف التحقق من الـ Referrer أيضًا
const io = new Server(httpServer, {
    cors: {
        origin: function (origin, callback) {
            // السماح للطلبات بدون origin (مثل curl)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.error(`🚨 CORS Blocked: ${origin} from ${req?.ip || 'unknown'}`);
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
    }
});

    io.on('connection', (socket) => {
        console.log('✅ A user connected from allowed origin:', socket.handshake.headers.origin);
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
