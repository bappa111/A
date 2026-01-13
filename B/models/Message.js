const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    message: { type: String, default: null },
    image: { type: String, default: null },

    // 🔥 VOICE MESSAGE
    voice: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
