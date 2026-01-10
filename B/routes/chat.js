const express = require("express");
const Chat = require("../models/Chat");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * SEND MESSAGE
 * POST /api/chat/send
 * body: { receiverId, message }
 */
router.post("/send", auth, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ msg: "receiverId & message required" });
    }

    const chat = await Chat.create({
      senderId: req.user.id,
      receiverId,
      message
    });

    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Chat send failed" });
  }
});

/**
 * GET CHAT BETWEEN TWO USERS
 * GET /api/chat/:userId
 */
router.get("/:userId", auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    const chats = await Chat.find({
      $or: [
        { senderId: req.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.id }
      ]
    }).sort({ createdAt: 1 });

    res.json(chats);
  } catch (err) {
    res.status(500).json({ msg: "Chat fetch failed" });
  }
});

module.exports = router;
