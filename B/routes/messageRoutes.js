const express = require("express");
const Message = require("../models/Message");
const User = require("../models/User"); // ✅ ADD
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

  // 1️⃣ Create message
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

  // 2️⃣ AUTO FRIEND ADD (safe)
  const senderId = req.user.id;

  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

  if (sender && !sender.friends.includes(receiverId)) {
    sender.friends.push(receiverId);
    await sender.save();
  }

  if (receiver && !receiver.friends.includes(senderId)) {
    receiver.friends.push(senderId);
    await receiver.save();
  }

  // 3️⃣ Return message
  res.json(msg);
});

/* ======================
   MARK SEEN  (⚠️ MUST be above /:userId)
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

  res.json({ ok: true });
});

/* ======================
   GET CHAT (mark delivered + hide deleted)
====================== */
router.get("/:userId", auth, async (req, res) => {
  // mark delivered
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
    ],
    deletedFor: { $ne: req.user.id }
  }).sort({ createdAt: 1 });

  res.json(messages);
});

/* ======================
   DELETE MESSAGE (for everyone)
====================== */
router.delete("/:id", auth, async (req, res) => {
  const msg = await Message.findById(req.params.id);
  if (!msg) return res.json({ ok: true });

  // only sender can delete
  if (msg.senderId.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  msg.deletedFor = [msg.senderId, msg.receiverId];
  await msg.save();

  res.json({ ok: true });
});

module.exports = router;
