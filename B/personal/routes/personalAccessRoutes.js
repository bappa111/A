const express = require("express");
const auth = require("../../middleware/authMiddleware");
const Access = require("../models/PersonalAccessRequest");
const PersonalPost = require("../models/PersonalPost");

const router = express.Router();

/* ======================
   REQUEST ACCESS
====================== */
router.post("/request/:ownerId", auth, async (req, res) => {
  // ❌ owner cannot request own access
  if (req.params.ownerId === req.user.id) {
    return res.status(400).json({ msg: "Invalid request" });
  }

  await Access.findOneAndUpdate(
    {
      owner: req.params.ownerId,
      requester: req.user.id
    },
    {
      status: "pending"
    },
    {
      upsert: true,
      new: true
    }
  );

  res.json({ requested: true });
});

/* ======================
   GET PENDING ACCESS REQUESTS (OWNER ONLY)
====================== */
router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await Access.find({
      owner: req.user.id,
      status: "pending"
    }).populate("requester", "name profilePic");

    res.json(requests);
  } catch (e) {
    res.status(500).json([]);
  }
});

/* ======================
   APPROVE ACCESS (OWNER ONLY)
====================== */
router.post("/approve/:id", auth, async (req, res) => {
  const reqAccess = await Access.findById(req.params.id);

  if (!reqAccess || reqAccess.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  reqAccess.status = "approved";
  await reqAccess.save();

  // 🔒 Grant access to ALL existing personal posts of owner
  // (future: can be per-post if needed)
  await PersonalPost.updateMany(
    { owner: req.user.id },
    { $addToSet: { allowedUsers: reqAccess.requester } }
  );

  res.json({ approved: true });
});

/* ======================
   REJECT ACCESS (OWNER ONLY)
====================== */
router.post("/reject/:id", auth, async (req, res) => {
  const reqAccess = await Access.findById(req.params.id);

  if (!reqAccess || reqAccess.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  reqAccess.status = "rejected";
  await reqAccess.save();

  res.json({ rejected: true });
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

module.exports = router;
