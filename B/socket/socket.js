const socketio = require("socket.io");
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

    // 🔥 join private room
    socket.join(uid);
    onlineUsers.set(uid, socket.id);

    try {
      await User.findByIdAndUpdate(uid, { isOnline: true });
    } catch (e) {
      console.log("Socket online update error:", e.message);
    }

    // optional broadcast
    io.emit("online-users", [...onlineUsers.keys()]);

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
   HELPERS
====================== */
const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
};

const notifyUser = (userId, event, payload = {}) => {
  if (!ioInstance) return;
  ioInstance.to(userId.toString()).emit(event, payload);
};

module.exports = { initSocket, getIO, notifyUser };
