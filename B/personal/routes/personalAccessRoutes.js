const express = require("express");
const auth = require("../../middleware/authMiddleware");
const Access = require("../models/PersonalAccessRequest");
const PersonalPost = require("../models/PersonalPost");

const router = express.Router();

/* REQUEST ACCESS */
router.post("/request/:ownerId", auth, async (req, res) => {
  await Access.findOneAndUpdate(
    {
      owner: req.params.ownerId,
      requester: req.user.id
    },
    {},
    { upsert: true }
  );

  res.json({ requested: true });
});

/* APPROVE ACCESS */
router.post("/approve/:id", auth, async (req, res) => {
  const reqAccess = await Access.findById(req.params.id);
  if (!reqAccess || reqAccess.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  reqAccess.status = "approved";
  await reqAccess.save();

  await PersonalPost.updateMany(
    { owner: req.user.id },
    { $addToSet: { allowedUsers: reqAccess.requester } }
  );

  res.json({ approved: true });
});

/* REJECT ACCESS */
router.post("/reject/:id", auth, async (req, res) => {
  const reqAccess = await Access.findById(req.params.id);
  if (!reqAccess || reqAccess.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  reqAccess.status = "rejected";
  await reqAccess.save();

  res.json({ rejected: true });
});

module.exports = router;
