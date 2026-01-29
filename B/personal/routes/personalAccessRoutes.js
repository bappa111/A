const express = require("express");
const auth = require("../../middleware/authMiddleware");
const Access = require("../models/PersonalAccessRequest");
const PersonalPost = require("../models/PersonalPost");

const router = express.Router();

/* ======================
   REQUEST ACCESS (USER → OWNER)
====================== */
router.post("/request/:ownerId", auth, async (req, res) => {
  if (req.params.ownerId === req.user.id) {
    return res.status(400).json({ msg: "Invalid request" });
  }

  await Access.findOneAndUpdate(
    { owner: req.params.ownerId, requester: req.user.id },
    { status: "pending" },
    { upsert: true, new: true }
  );

  // 🔔 realtime notify owner
  const { getIO } = require("../../socket/socket");
  getIO().to(req.params.ownerId).emit("access-requested");

  res.json({ requested: true });
});

/* ======================
   CHECK MY ACCESS STATUS
====================== */
router.get("/status/:ownerId", auth, async (req, res) => {
  const record = await Access.findOne({
    owner: req.params.ownerId,
    requester: req.user.id
  });

  if (!record) return res.json({ status: "none" });
  res.json({ status: record.status });
});

/* ======================
   GET PENDING REQUESTS (OWNER ONLY)
====================== */
router.get("/requests", auth, async (req, res) => {
  const list = await Access.find({
    owner: req.user.id,
    status: "pending"
  }).populate("requester", "name profilePic");

  res.json(list);
});

/* ======================
   GET ALL ACCESS (OWNER ONLY)
====================== */
router.get("/all", auth, async (req, res) => {
  const list = await Access.find({ owner: req.user.id })
    .populate("requester", "name profilePic")
    .sort({ createdAt: -1 });

  res.json(list);
});

/* ======================
   APPROVE ACCESS (OWNER ONLY)
====================== */
router.post("/approve/:id", auth, async (req, res) => {
  const access = await Access.findById(req.params.id);

  if (!access || access.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  access.status = "approved";
  await access.save();

  // 🔓 give access to all existing posts
  await PersonalPost.updateMany(
    { owner: req.user.id },
    { $addToSet: { allowedUsers: access.requester } }
  );

  // 🔔 realtime notify requester
  const { getIO } = require("../../socket/socket");
  getIO().to(access.requester.toString()).emit("access-approved");

  res.json({ approved: true });
});

/* ======================
   REJECT ACCESS (OWNER ONLY)
====================== */
router.post("/reject/:id", auth, async (req, res) => {
  const access = await Access.findById(req.params.id);

  if (!access || access.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  access.status = "rejected";
  await access.save();

  // 🔔 realtime notify requester
  const { getIO } = require("../../socket/socket");
  getIO().to(access.requester.toString()).emit("access-rejected");

  res.json({ rejected: true });
});

/* ======================
   REMOVE ACCESS (OWNER ONLY)
====================== */
router.post("/remove/:requesterId", auth, async (req, res) => {
  const requesterId = req.params.requesterId;

  await Access.deleteOne({
    owner: req.user.id,
    requester: requesterId
  });

  await PersonalPost.updateMany(
    { owner: req.user.id },
    { $pull: { allowedUsers: requesterId } }
  );

  res.json({ removed: true });
});

module.exports = router;
