const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// Get all users except me
router.get("/", auth, async (req, res) => {
  const users = await User.find(
    { _id: { $ne: req.user.id } },
    { password: 0 }
  );
  res.json(users);
});

// 👤 GET USER PROFILE
router.get("/profile/:id", auth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("name email profilePic bio");

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  const posts = await Post.find({ userId: req.params.id })
    .sort({ createdAt: -1 });

  res.json({ user, posts });
});

module.exports = router;
