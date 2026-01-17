const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   GET ALL USERS (except me)
====================== */
router.get("/", auth, async (req, res) => {
  const users = await User.find(
    { _id: { $ne: req.user.id } },
    { password: 0 }
  );
  res.json(users);
});

/* ======================
   GET USER PROFILE
====================== */
router.get("/profile/:id", auth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("name email profilePic bio followers following");

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  const posts = await Post.find({ userId: req.params.id })
    .sort({ createdAt: -1 });

  res.json({
    user: {
      ...user.toObject(),
      followersCount: user.followers.length,
      followingCount: user.following.length
    },
    posts
  });
});

/* ======================
   UPDATE OWN PROFILE (bio + profilePic)
====================== */
router.put("/profile", auth, async (req, res) => {
  const { bio, profilePic } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  if (bio !== undefined) user.bio = bio;
  if (profilePic !== undefined) user.profilePic = profilePic;

  await user.save();

  res.json({
    msg: "Profile updated",
    user
  });
});

/* ======================
   FOLLOW / UNFOLLOW USER
====================== */
router.post("/follow/:id", auth, async (req, res) => {
  const me = await User.findById(req.user.id);
  const other = await User.findById(req.params.id);

  if (!other) {
    return res.status(404).json({ msg: "User not found" });
  }

  // already following → unfollow
  if (me.following.includes(other._id)) {
    me.following.pull(other._id);
    other.followers.pull(me._id);

    await me.save();
    await other.save();

    return res.json({ followed: false });
  }

  // follow
  me.following.push(other._id);
  other.followers.push(me._id);

  await me.save();
  await other.save();

  res.json({ followed: true });
});

module.exports = router;
