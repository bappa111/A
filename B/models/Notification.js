const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },

    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    type: {
      type: String,
      enum: [
        "follow_request",
        "follow_accept",
        "new_follower",
        "like",
        "comment",
        "message",
        "system"
      ],
      required: true
    },

    text: {
      type: String,
      required: true
    },

    link: {
      type: String,
      default: ""
    },

    seen: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
