const express = require("express");
const Message = require("../models/Message");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   SEND MESSAGE
====================== */
router.post("/", auth, async (req, res) => {
  const { receiverId, message, image, voice, video } = req.body;

  if (!receiverId) {
    return res.status(400).json({ msg: "receiverId required" });
  }

  const msg = await Message.create({
    senderId: req.user.id,
    receiverId,
    message: message || null,
    image: image || null,
    voice: voice || null,
    video: video || null,
    delivered: false,
    seen: false
  });

  res.json(msg);
});

/* ======================
   MARK SEEN  ✅ MUST BE ABOVE /:userId
====================== */
router.post("/seen/:userId", auth, async (req, res) => {
  await Message.updateMany(
    {
      senderId: req.params.userId,
      receiverId: req.user.id,
      seen: false
    },
    { seen: true }
  );

  res.json({ msg: "Seen updated" });
});

/* ======================
   GET CHAT (also mark delivered)
====================== */
router.get("/:userId", auth, async (req, res) => {
  await Message.updateMany(
    {
      senderId: req.params.userId,
      receiverId: req.user.id,
      delivered: false
    },
    { delivered: true }
  );

  const messages = await Message.find({
    $or: [
      { senderId: req.user.id, receiverId: req.params.userId },
      { senderId: req.params.userId, receiverId: req.user.id }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});

/* ======================
   DELETE MESSAGE
====================== */
router.delete("/:id", auth, async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.status(404).json({ msg: "Not found" });

  if (msg.senderId.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  await msg.deleteOne();
  res.json({ msg: "Deleted" });
});

module.exports = router;
