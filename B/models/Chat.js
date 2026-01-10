const mongoose = require("mongoose");

const ChatSchema = new mongoose.Schema({
  senderId: mongoose.Schema.Types.ObjectId,
  receiverId: mongoose.Schema.Types.ObjectId,
  message: String
}, { timestamps: true });

module.exports = mongoose.model("Chat", ChatSchema);
