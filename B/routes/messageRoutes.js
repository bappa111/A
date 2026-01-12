const express = require("express");
const Message = require("../models/Message");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   SEND MESSAGE (TEXT / IMAGE)
====================== */
router.post("/", auth, async (req, res) => {
  try {
    const { receiverId, message, image } = req.body;

    const msg = await Message.create({
      sender: req.user.id,      // ✅ FIXED
      receiver: receiverId,     // ✅ FIXED
      message: message || null,
      image: image || null
    });

    res.json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Message send failed" });
  }
});

/* ======================
   GET CHAT HISTORY
====================== */
router.get("/:userId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user.id }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to load messages" });
  }
});

module.exports = router;
