// src/config/socket.js

const { Server } = require("socket.io");

let io;

function initSocket(httpServer) {
    // 🎯 قائمة النطاقات المسموح بها
    const allowedOrigins = [
        "https://bae.up.railway.app", // نطاق الإنتاج الرئيسي
        "http://localhost:3000",      // نطاق التطوير المحلي (يمكنك تغييره أو حذفه)
        "http://127.0.0.1:5500"       // مثال لنطاق آخر قد تستخدمه
    ];

    io = new Server(httpServer, {
        cors: {
            // ✅ استبدال "*" بالقائمة الموثوقة
            origin: function (origin, callback) {
                // السماح بالطلبات التي لا تحتوي على origin (مثل تطبيقات الموبايل أو Postman)
                if (!origin) return callback(null, true);
                
                if (allowedOrigins.indexOf(origin) === -1) {
                    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                    return callback(new Error(msg), false);
                }
                return callback(null, true);
            },
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);
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
