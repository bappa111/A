const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   SEND MESSAGE (PRIVATE SAFE)
====================== */
router.post("/", auth, async (req, res) => {
  const { receiverId, message, image, voice, video } = req.body;
  if (!receiverId) return res.status(400).json({ msg: "receiverId required" });

  const sender = await User.findById(req.user.id);
  const receiver = await User.findById(receiverId);
  if (!receiver) return res.status(404).json({ msg: "Receiver not found" });

  // 🔒 PRIVATE PROFILE BLOCK
  if (receiver.isPrivate && !receiver.followers.includes(req.user.id)) {
    return res.status(403).json({ msg: "Follow required to chat" });
  }

  const msg = await Message.create({
    senderId: req.user.id,
    receiverId,
    message: message || null,
    image: image || null,
    voice: voice || null,
    video: video || null,
    delivered: false,
    seen: false,
    deletedFor: []
  });

  // AUTO FRIEND
  if (!sender.friends.includes(receiverId)) {
    sender.friends.push(receiverId);
    await sender.save();
  }
  if (!receiver.friends.includes(req.user.id)) {
    receiver.friends.push(req.user.id);
    await receiver.save();
  }

  await Notification.create({
    userId: receiverId,
    fromUser: req.user.id,
    type: "message",
    text: "New message received",
    link: `/chat.html?userId=${req.user.id}`
  });

  res.json(msg);
});

/* ======================
   GET CHAT
====================== */
router.get("/:userId", auth, async (req, res) => {
  const messages = await Message.find({
    $or: [
      { senderId: req.user.id, receiverId: req.params.userId },
      { senderId: req.params.userId, receiverId: req.user.id }
    ],
    deletedFor: { $ne: req.user.id }
  }).sort({ createdAt: 1 });

  res.json(messages);
});

module.exports = router;
