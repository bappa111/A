const socketio = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

const onlineUsers = new Map();

const initSocket = (server) => {
  const io = socketio(server, {
    cors: { origin: "*" }
  });

  io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;

    /* ======================
       USER ONLINE
    ====================== */
    if (userId) {
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit("online-users", [...onlineUsers.keys()]);
    }

    /* ======================
       PRIVATE MESSAGE
    ====================== */
    socket.on("private-message", async ({ to, message }) => {
      const msg = await Message.create({
        senderId: userId,
        receiverId: to,
        message,
        delivered: true,
        seen: false
      });

      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit("private-message", msg);
      }
    });

    /* ======================
       MESSAGE SEEN (🔥 NEW)
    ====================== */
    socket.on("message-seen", ({ senderId }) => {
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) {
        io.to(senderSocket).emit("message-seen");
      }
    });

    /* ======================
       DISCONNECT
    ====================== */
    socket.on("disconnect", async () => {
      if (userId) {
        onlineUsers.delete(userId);
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });
        io.emit("online-users", [...onlineUsers.keys()]);
      }
    });
  });
};

module.exports = { initSocket };
