module.exports = (io) => {
  io.on("connection", (socket) => {

    // user joins own room
    socket.on("join", (userId) => {
      socket.join(userId);
    });

    // send message to specific user
    socket.on("sendMessage", ({ receiverId, message }) => {
      io.to(receiverId).emit("receiveMessage", {
        message
      });
    });

  });
};
