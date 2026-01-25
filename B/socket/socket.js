const socketio = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

/*
  onlineUsers:
  key   = userId (string)
  value = socket.id
*/
const onlineUsers = new Map();
let ioInstance = null;

/* ======================
   INIT SOCKET
====================== */
const initSocket = (server) => {
  const io = socketio(server, {
    cors: { origin: "*" }
  });

  ioInstance = io;

  io.on("connection", async (socket) => {
    const userId = socket.handshake.query.userId;

    /* ======================
       USER ONLINE
    ====================== */
    if (userId) {
       const uid = userId.toString();
      onlineUsers.set(uid, socket.id);

      socket.join(uid); // 🔥🔥 THIS IS THE FIX (ABSOLUTELY REQUIRED)

      try {
        await User.findByIdAndUpdate(uid, {
          isOnline: true
        });
      } catch (e) {
        console.log("User online update error:", e.message);
      }

      io.emit("online-users", [...onlineUsers.keys()]);
    }

    /* ======================
       PRIVATE MESSAGE
    ====================== */
    socket.on("private-message", async ({ to, message }) => {
      if (!userId || !to || !message) return;

      try {
        const msg = await Message.create({
          senderId: userId,
          receiverId: to,
          message,
          delivered: true,
          seen: false
        });

        const targetSocket = onlineUsers.get(to.toString());
        if (targetSocket) {
          io.to(targetSocket).emit("private-message", msg);
        }
      } catch (e) {
        console.log("Private message error:", e.message);
      }
    });

    /* ======================
       MESSAGE SEEN
    ====================== */
    socket.on("message-seen", ({ senderId }) => {
      if (!senderId) return;

      const senderSocket = onlineUsers.get(senderId.toString());
      if (senderSocket) {
        io.to(senderSocket).emit("message-seen");
      }
    });

    /* ======================
       DISCONNECT
    ====================== */
    socket.on("disconnect", async () => {
      if (!userId) return;

      const uid = userId.toString();
      onlineUsers.delete(uid);

      try {
        await User.findByIdAndUpdate(uid, {
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (e) {
        console.log("User offline update error:", e.message);
      }

      io.emit("online-users", [...onlineUsers.keys()]);
    });
  });
};

/* ======================
   GET IO INSTANCE
   (Used by routes for realtime notification)
====================== */
const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
};

module.exports = {
  initSocket,
  getIO
};
