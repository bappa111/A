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
  content: req.body.content || "",
  video: req.body.video || null
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

module.exports = router;
