// src/config/socket.js

const { Server } = require("socket.io");

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
