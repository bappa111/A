const express = require("express");
const router = express.Router();
const auth = require("../../middleware/authMiddleware");
const Access = require("../../personal/models/PersonalAccessRequest");

router.post("/call/:toUserId", auth, async (req, res) => {
  const me = req.user.id;
  const ownerId = req.params.toUserId;

  // owner always allowed
  if (me === ownerId) return res.json({ ok: true });

  // check personal access
  const access = await Access.findOne({
    owner: ownerId,
    requester: me,
    status: "approved"
  });

  if (!access) {
    return res.status(403).json({
      msg: "Personal access required for calling"
    });
  }

  // ✅ allowed
  res.json({ ok: true });
});

module.exports = router;
