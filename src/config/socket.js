const { Server } = require("socket.io");

let io;

function initSocket(httpServer) {
    // أبسط إعدادات CORS للسماح للجميع مؤقتاً للتشخيص
    io = new Server(httpServer, {
        cors: {
            origin: "*", // 🎯 السماح لجميع المصادر مؤقتاً
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ A user connected (Simple Config)');
        
        const userId = socket.handshake.query.userId;
        if (userId) {
            socket.join(userId);
        }
        socket.on('disconnect', () => {
            console.log('User disconnected');
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
