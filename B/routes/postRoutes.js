const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
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
   GET FEED (with followedBy badge data)
====================== */
router.get("/", auth, async (req, res) => {
  const myId = req.user.id;

  const posts = await Post.find()
    .populate("userId", "name profilePic followers")
    .sort({ createdAt: -1 })
    .lean();

  const formattedPosts = posts.map(p => {
    // followers of post owner (except me)
    const followedBy = (p.userId.followers || [])
      .filter(fid => fid.toString() !== myId)
      .slice(0, 2); // UI clean (max 2)

    return {
      ...p,
      followedBy
    };
  });

  res.json(formattedPosts);
});

/* ======================
   LIKE / UNLIKE POST
====================== */
router.post("/:id/like", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  const userId = req.user.id;
  const index = post.likes.indexOf(userId);

  if (index === -1) {
    post.likes.push(userId);
  } else {
    post.likes.splice(index, 1);
  }

  await post.save();
  res.json({ likes: post.likes.length });
});

/* ======================
   ADD COMMENT
====================== */
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

/* ======================
   DELETE POST (only owner)
====================== */
router.delete("/:id", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  if (post.userId.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  await post.deleteOne();
  res.json({ msg: "Post deleted" });
});

module.exports = router;
