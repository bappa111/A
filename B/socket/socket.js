const onlineUsers = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // user joins own room
    socket.on("join", (userId) => {
      console.log("JOIN:", userId);
      onlineUsers[userId] = socket.id;
      socket.join(userId);
      io.emit("onlineUsers", Object.keys(onlineUsers));
    });

    // send message to specific user
    socket.on("sendMessage", ({ receiverId, senderId, message }) => {
      console.log("SEND:", senderId, "->", receiverId, message);

      // send ONLY to receiver room
      io.to(receiverId).emit("receiveMessage", {
        senderId,
        message
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
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
