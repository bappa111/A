const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   SEND MESSAGE (PRIVATE HARD BLOCK)
====================== */
router.post("/", auth, async (req, res) => {
  const { receiverId, message, image, voice, video } = req.body;

  const sender = await User.findById(req.user.id);
  const receiver = await User.findById(receiverId);

  if (!receiver) return res.status(404).json({ msg: "User not found" });

  // 🔒 HARD BLOCK — NO FOLLOW = NO CHAT
  if (receiver.isPrivate && !receiver.followers.includes(sender._id)) {
    return res.status(403).json({ msg: "Follow required to chat" });
  }

  const msg = await Message.create({
    senderId: sender._id,
    receiverId,
    message: message || null,
    image: image || null,
    voice: voice || null,
    video: video || null,
    delivered: false,
    seen: false,
    deletedFor: []
  });

  await Notification.create({
    userId: receiverId,
    fromUser: sender._id,
    type: "message",
    text: "New message received",
    link: `/chat.html?userId=${sender._id}`
  });

  res.json(msg);
});

module.exports = router;
