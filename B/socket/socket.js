const onlineUsers = {};

module.exports = (io) => {
  io.on("connection", (socket) => {

    socket.on("join", (userId) => {
      onlineUsers[userId] = socket.id;
      socket.join(userId);
      io.emit("onlineUsers", Object.keys(onlineUsers));
    });

    socket.on("sendMessage", ({ receiverId, senderId, message }) => {
      io.to(receiverId).emit("receiveMessage", {
        senderId,
        message
      });
    });

    socket.on("disconnect", () => {
      for (const userId in onlineUsers) {
        if (onlineUsers[userId] === socket.id) {
          delete onlineUsers[userId];
          break;
        }
      }
      io.emit("onlineUsers", Object.keys(onlineUsers));
    });

  });
};
