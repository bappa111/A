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
    .select("name email profilePic bio followers following isPrivate");

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
   UPDATE OWN PROFILE
====================== */
router.put("/profile", auth, async (req, res) => {
  const { bio, profilePic, isPrivate } = req.body;

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  if (bio !== undefined) user.bio = bio;
  if (profilePic !== undefined) user.profilePic = profilePic;
  if (isPrivate !== undefined) user.isPrivate = isPrivate;

  await user.save();

  res.json({ msg: "Profile updated", user });
});

/* ======================
   FOLLOW / UNFOLLOW / REQUEST
====================== */
router.post("/follow/:id", auth, async (req, res) => {
  const me = await User.findById(req.user.id);
  const other = await User.findById(req.params.id);

  if (!other) {
    return res.status(404).json({ msg: "User not found" });
  }

  // UNFOLLOW
  if (me.following.includes(other._id)) {
    me.following.pull(other._id);
    other.followers.pull(me._id);

    await me.save();
    await other.save();

    return res.json({ followed: false });
  }

  // PRIVATE PROFILE → FOLLOW REQUEST
  if (other.isPrivate) {
    if (!other.followRequests.includes(me._id)) {
      other.followRequests.push(me._id);
      await other.save();
    }
    return res.json({ requested: true });
  }

  // PUBLIC PROFILE → DIRECT FOLLOW
  me.following.push(other._id);
  other.followers.push(me._id);

  await me.save();
  await other.save();

  res.json({ followed: true });
});

/* ======================
   ACCEPT FOLLOW REQUEST
====================== */
router.post("/follow-accept/:id", auth, async (req, res) => {
  const me = await User.findById(req.user.id);       // profile owner
  const other = await User.findById(req.params.id); // requester

  if (!me.followRequests.includes(other._id)) {
    return res.status(400).json({ msg: "No request found" });
  }

  me.followRequests.pull(other._id);
  me.followers.push(other._id);
  other.following.push(me._id);

  await me.save();
  await other.save();

  res.json({ accepted: true });
});

/* ======================
   GET FOLLOWERS LIST
====================== */
router.get("/:id/followers", auth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate("followers", "name profilePic");

  if (!user) return res.status(404).json({ msg: "User not found" });

  res.json(user.followers);
});

/* ======================
   GET FOLLOWING LIST
====================== */
router.get("/:id/following", auth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate("following", "name profilePic");

  if (!user) return res.status(404).json({ msg: "User not found" });

  res.json(user.following);
});

/* ======================
   FRIEND LIST (CHAT)
====================== */
router.get("/friends", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("friends", "name profilePic");

  res.json(user.friends || []);
});

module.exports = router;
