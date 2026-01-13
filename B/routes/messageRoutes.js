const express = require("express");
const Message = require("../models/Message");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// SEND MESSAGE (TEXT / IMAGE / VOICE)
router.post("/", auth, async (req, res) => {
  const { receiverId, message, image, voice } = req.body;

  if (!receiverId) {
    return res.status(400).json({ msg: "receiverId required" });
  }

  const msg = await Message.create({
    senderId: req.user.id,
    receiverId,
    message: message || null,
    image: image || null,
    voice: voice || null
  });

  res.json(msg);
});

// GET CHAT HISTORY
router.get("/:userId", auth, async (req, res) => {
  const messages = await Message.find({
    $or: [
      { senderId: req.user.id, receiverId: req.params.userId },
      { senderId: req.params.userId, receiverId: req.user.id }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});

module.exports = router;
