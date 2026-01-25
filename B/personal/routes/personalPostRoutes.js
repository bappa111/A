const express = require("express");
const auth = require("../../middleware/authMiddleware");
const PersonalPost = require("../models/PersonalPost");

const router = express.Router();

/* CREATE PERSONAL POST */
router.post("/", auth, async (req, res) => {
  const post = await PersonalPost.create({
    owner: req.user.id,
    content: req.body.content || "",
    image: req.body.image || null,
    video: req.body.video || null
  });

  res.json(post);
});

/* GET PERSONAL POSTS (OWNER / ALLOWED ONLY) */
router.get("/:ownerId", auth, async (req, res) => {
  const ownerId = req.params.ownerId;
  const me = req.user.id;

  const posts = await PersonalPost.find({
    owner: ownerId,
    $or: [
      { owner: me },
      { allowedUsers: me }
    ]
  }).sort({ createdAt: -1 });

  res.json(posts);
});

router.post("/", auth, async (req, res) => {
  const post = await PersonalPost.create({
    userId: req.user.id,
    content: req.body.content
  });

  res.json(post);
});

/* DELETE PERSONAL POST (OWNER ONLY) */
router.delete("/:id", auth, async (req, res) => {
  const post = await PersonalPost.findById(req.params.id);
  if (!post || post.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  await post.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
