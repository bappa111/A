const express = require("express");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   GET MY NOTIFICATIONS (FINAL FIX)
====================== */
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id
    })
      .populate({
        path: "fromUser",
        select: "name profilePic"
      })
      .sort({ createdAt: -1 })
      .lean(); // 🔥 IMPORTANT

    res.json(notifications);
  } catch (err) {
    console.error("Notification load error:", err);
    res.status(500).json([]);
  }
});

/* ======================
   GET UNSEEN COUNT (BADGE)
====================== */
router.get("/count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      seen: false
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

/* ======================
   MARK SINGLE AS SEEN
====================== */
router.post("/seen/:id", auth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { seen: true }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

/* ======================
   MARK ALL AS SEEN (FUTURE)
====================== */
router.post("/seen-all", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, seen: false },
      { seen: true }
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
