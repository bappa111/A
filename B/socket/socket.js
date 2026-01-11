module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", (userId) => {
      console.log("JOIN room:", userId);
      socket.join(userId);
    });

    socket.on("sendMessage", ({ receiverId, senderId, message }) => {
      console.log("SEND", senderId, "->", receiverId, message);
      io.to(receiverId).emit("receiveMessage", {
        senderId,
        message
      });
    });
  });
};
