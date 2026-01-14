const mongoose = require("mongoose");   // 🔥 এই লাইনটা MISSING ছিল

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    message: { type: String, default: null },
    image: { type: String, default: null },
    voice: { type: String, default: null },
    video: { type: String, default: null },

    delivered: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },

    // ✅ delete for everyone support
    deletedFor: {
      type: [mongoose.Schema.Types.ObjectId],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
