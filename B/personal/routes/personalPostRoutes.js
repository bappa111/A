const express = require("express");
const auth = require("../../middleware/authMiddleware");
const PersonalPost = require("../models/PersonalPost");

const router = express.Router();

/* ======================
   CREATE PERSONAL POST (OWNER ONLY)
====================== */
router.post("/", auth, async (req, res) => {
  try {
    const post = await PersonalPost.create({
      owner: req.user.id,
      content: req.body.content || "",
      image: req.body.image || null,
      video: req.body.video || null,
      allowedUsers: [] // 🔒 default no access
    });

    res.json(post);
  } catch (e) {
    res.status(500).json({ msg: "Personal post create failed" });
  }
});

/* ======================
   GET PERSONAL POSTS
   (OWNER OR APPROVED USERS ONLY)
====================== */
router.get("/:ownerId", auth, async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const me = req.user.id;

    const posts = await PersonalPost.find({
      owner: ownerId,
      $or: [
        { owner: me },
        { allowedUsers: me }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (e) {
    res.status(500).json([]);
  }
});

/* ======================
   DELETE PERSONAL POST (OWNER ONLY)
====================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await PersonalPost.findById(req.params.id);

    if (!post || post.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    await post.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ msg: "Delete failed" });
  }
});

module.exports = router;
