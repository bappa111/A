const express = require("express");
const Post = require("../models/Post");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   CREATE POST (text / image / video)
====================== */
router.post("/", auth, async (req, res) => {
  const { content, image, video } = req.body;

  const post = await Post.create({
    userId: req.user.id,
    content: content || "",
    image: image || null,
    video: video || null
  });

  res.json(post);
});

/* ======================
   GET FEED
====================== */
router.get("/", auth, async (req, res) => {
  const posts = await Post.find()
    .populate("userId", "name")
    .sort({ createdAt: -1 });

  res.json(posts);
});

// 👍 LIKE / UNLIKE POST
router.post("/:id/like", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  const userId = req.user.id;

  const index = post.likes.indexOf(userId);

  if (index === -1) {
    // like
    post.likes.push(userId);
  } else {
    // unlike
    post.likes.splice(index, 1);
  }

  await post.save();
  res.json({ likes: post.likes.length });
});

// 💬 ADD COMMENT
router.post("/:id/comment", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  post.comments.push({
    userId: req.user.id,
    text: req.body.text
  });

  await post.save();
  res.json(post.comments);
});

module.exports = router;
