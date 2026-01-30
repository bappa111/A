const mongoose = require("mongoose");

const PersonalAccessRequestSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

// 🔥 IMPORTANT: prevent duplicate requests
PersonalAccessRequestSchema.index(
  { owner: 1, requester: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "PersonalAccessRequest",
  PersonalAccessRequestSchema
);
