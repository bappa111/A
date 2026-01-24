const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

/* 🔥 SOCKET (REALTIME) */
const { getIO } = require("../socket/socket");

const router = express.Router();

/* ======================
   REALTIME NOTIFICATION HELPER
====================== */
function emitNotification(userId, notification) {
  try {
    const io = getIO();
    if (!io) return;

    io.to(userId.toString()).emit("notification", notification);
  } catch (e) {
    console.log("Realtime emit error:", e.message);
  }
}

/* ======================
   SEND MESSAGE (PRIVATE HARD BLOCK)
====================== */
router.post("/", auth, async (req, res) => {
  const { receiverId, message, image, voice, video } = req.body;

  if (!receiverId) {
    return res.status(400).json({ msg: "receiverId required" });
  }

  const sender = await User.findById(req.user.id);
  const receiver = await User.findById(receiverId);

  if (!receiver) {
    return res.status(404).json({ msg: "User not found" });
  }

  // ❌ BLOCK SELF CHAT
  if (sender._id.toString() === receiver._id.toString()) {
    return res.status(400).json({ msg: "Cannot message yourself" });
  }

  // 🔒 HARD BLOCK — PRIVATE + NOT FOLLOWER
  if (
    receiver.isPrivate &&
    !receiver.followers.some(id => id.toString() === sender._id.toString())
  ) {
    return res.status(403).json({ msg: "Follow required to chat" });
  }

  /* ======================
     CREATE MESSAGE
  ====================== */
  const msg = await Message.create({
    senderId: sender._id,
    receiverId: receiver._id,
    message: message || null,
    image: image || null,
    voice: voice || null,
    video: video || null,
    delivered: false,
    seen: false,
    deletedFor: []
  });

  /* ======================
     CREATE NOTIFICATION
  ====================== */
  const notif = await Notification.create({
    userId: receiver._id,
    fromUser: sender._id,
    type: "message",
    text: "New message received",
    link: `/chat.html?userId=${sender._id}`
  });

  /* 🔥 REALTIME NOTIFICATION */
  emitNotification(receiver._id, notif);

  res.json(msg);
});

module.exports = router;
