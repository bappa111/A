const express = require("express");
const Message = require("../models/Message");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Send message
router.post("/", auth, async (req, res) => {
  const { receiverId, message } = req.body;

  const msg = await Message.create({
    senderId: req.user.id,
    receiverId,
    message
  });

  res.json(msg);
});

// Get chat history
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
