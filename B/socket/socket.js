const socketio = require("socket.io");
const Message = require("../models/Message");
const User = require("../models/User");

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
    if (!userId) return;

    const uid = userId.toString();

    // 🔥 JOIN USER ROOM (for notifications)
    socket.join(uid);
    onlineUsers.set(uid, socket.id);

    try {
      await User.findByIdAndUpdate(uid, { isOnline: true });
    } catch (e) {
      console.log("Socket online update error:", e.message);
    }

    // 🔔 OPTIONAL: broadcast online users (future use)
    io.emit("online-users", [...onlineUsers.keys()]);

    /* ======================
       DISCONNECT
    ====================== */
    socket.on("disconnect", async () => {
      onlineUsers.delete(uid);

      try {
        await User.findByIdAndUpdate(uid, {
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (e) {
        console.log("Socket offline update error:", e.message);
      }

      io.emit("online-users", [...onlineUsers.keys()]);
    });
  });
};

/* ======================
   GET IO INSTANCE
====================== */
const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
};

module.exports = { initSocket, getIO };
