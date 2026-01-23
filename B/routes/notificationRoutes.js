const express = require("express");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   GET MY NOTIFICATIONS
====================== */
router.get("/", auth, async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .populate("fromUser", "name profilePic")
    .sort({ createdAt: -1 });

  res.json(notifications);
});

/* ======================
   GET UNSEEN COUNT
====================== */
router.get("/count", auth, async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    seen: false
  });

  res.json({ count });
});

/* ======================
   MARK AS SEEN
====================== */
router.post("/seen/:id", auth, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { seen: true });
  res.json({ ok: true });
});



module.exports = router;
