const socketio = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

const onlineUsers = new Map();
let ioInstance = null;

const initSocket = (server) => {
  const io = socketio(server, { cors: { origin: "*" } });
  ioInstance = io;

  io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return;

    socket.join(userId.toString()); // 🔥 CRITICAL FIX
    onlineUsers.set(userId.toString(), socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true });

    socket.on("disconnect", async () => {
      onlineUsers.delete(userId.toString());
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
    });
  });
};

const getIO = () => ioInstance;

module.exports = { initSocket, getIO };
