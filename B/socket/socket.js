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

    if (userId) {
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { isOnline: true });
      io.emit("online-users", [...onlineUsers.keys()]);
    }

    socket.on("private-message", async ({ to, message }) => {
      const msg = await Message.create({
        senderId: userId,
        receiverId: to,
        message
      });

      const targetSocket = onlineUsers.get(to);
      if (targetSocket) {
        io.to(targetSocket).emit("private-message", msg);
      }
    });

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
