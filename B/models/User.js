const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    profilePic: {
      type: String,
      default: null
    },

    bio: {
      type: String,
      default: ""
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    isPrivate: {
      type: Boolean,
      default: false
    },

    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    isOnline: {
      type: Boolean,
      default: false
    },

    lastSeen: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", UserSchema);
