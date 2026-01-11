const express = require("express");
const Post = require("../models/Post");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Create post
router.post("/", auth, async (req, res) => {
  const post = await Post.create({
    userId: req.user.id,
    content: req.body.content
  });
  res.json(post);
});

// Get feed
router.get("/", auth, async (req, res) => {
  const posts = await Post.find()
    .populate("userId", "name")
    .sort({ createdAt: -1 });

  res.json(posts);
});

module.exports = router;
