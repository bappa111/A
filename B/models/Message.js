const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    // 🔹 TEXT MESSAGE (old)
    message: {
      type: String
    },

    // 🔹 IMAGE MESSAGE (new)
    image: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
