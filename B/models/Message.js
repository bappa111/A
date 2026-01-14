const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    message: { type: String, default: null },
    image: { type: String, default: null },
    voice: { type: String, default: null },
    video: { type: String, default: null },

    // ✅ STATUS
    delivered: { type: Boolean, default: false },
    seen: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
