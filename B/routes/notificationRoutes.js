const express = require("express");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   GET MY NOTIFICATIONS
====================== */
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id
    })
      .populate("fromUser", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ msg: "Failed to load notifications" });
  }
});

/* ======================
   GET UNSEEN NOTIFICATION COUNT (BADGE)
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
   MARK SINGLE NOTIFICATION AS SEEN
====================== */
router.post("/seen/:id", auth, async (req, res) => {
  try {
    // 🔒 security: only owner can mark
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
   MARK ALL AS SEEN (FUTURE USE)
   (frontend already loops, but this keeps API ready)
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
