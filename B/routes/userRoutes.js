const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

/* 🔥 SOCKET (REALTIME) */
const { getIO } = require("../socket/socket");

const router = express.Router();

/* ======================
   REALTIME NOTIFICATION HELPER
====================== */
function emitNotification(userId, notification) {
  try {
    const io = getIO();
    if (!io) return;

    // 🔥 userId room এ পাঠানো
    io.to(userId.toString()).emit("notification", notification);
  } catch (e) {
    console.log("Realtime emit error:", e.message);
  }
}

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
   GET FOLLOW REQUESTS (OWNER ONLY)
   ⚠️ MUST STAY ABOVE /:id ROUTES
====================== */
router.get("/follow-requests", auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate("followRequests", "name profilePic");

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  res.json(user.followRequests || []);
});

/* ======================
   SEARCH USERS
====================== */
router.get("/search", auth, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    const users = await User.find({
      name: { $regex: q, $options: "i" },
      _id: { $ne: req.user.id }
    })
    .select("name profilePic")
    .limit(10);

    res.json(users);
  } catch (e) {
    res.status(500).json([]);
  }
});

/* ======================
   GET USER PROFILE (PRIVATE SAFE)
====================== */
router.get("/profile/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name email profilePic bio followers following isPrivate followRequests"
    );

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const isOwner = req.user.id === req.params.id;
    const isFollower = user.followers.some(
      id => id.toString() === req.user.id
    );

    let posts = [];
    if (!user.isPrivate || isOwner || isFollower) {
      posts = await Post.find({ userId: req.params.id })
        .sort({ createdAt: -1 });
    }

    // 🔥🔥 PROFILE PIC FIX (SAFE)
    let profilePic = user.profilePic;
    if (profilePic && !profilePic.startsWith("http")) {
      profilePic = `${req.protocol}://${req.get("host")}${profilePic}`;
    }

    res.json({
      user: {
        ...user.toObject(),
        profilePic, // ✅ FIXED HERE
        followersCount: user.followers.length,
        followingCount: user.following.length
      },
      posts
    });
  } catch (err) {
    console.error("Profile load error:", err);
    res.status(500).json({ msg: "Profile load failed" });
  }
});

/* ======================
   UPDATE OWN PROFILE
====================== */
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, bio, profilePic } = req.body;
    const update = {};

    // ✅ NAME VALIDATION (NO UNIQUE CHECK)
    if (name !== undefined) {
      const cleanName = name.trim();

      // length check
      if (cleanName.length < 2 || cleanName.length > 30) {
        return res.status(400).json({
          msg: "Name must be between 2 and 30 characters"
        });
      }

      // character check (letters + space only)
      const nameRegex = /^[a-zA-Z ]+$/;
      if (!nameRegex.test(cleanName)) {
        return res.status(400).json({
          msg: "Name can contain only letters and spaces"
        });
      }

      update.name = cleanName;
    }

    // ✅ BIO (empty allowed)
    if (bio !== undefined) {
      update.bio = bio;
    }

    // ✅ PROFILE PIC
    if (profilePic) {
      update.profilePic = profilePic;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      ok: true,
      user: {
        _id: user._id,
        name: user.name,
        bio: user.bio,
        profilePic: user.profilePic
      }
    });

  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ msg: "Profile update failed" });
  }
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

  // ❌ BLOCK SELF FOLLOW
  if (me._id.toString() === other._id.toString()) {
    return res.status(400).json({ msg: "Cannot follow yourself" });
  }

  /* 🔁 UNFOLLOW */
  if (me.following.includes(other._id)) {
    me.following.pull(other._id);
    other.followers.pull(me._id);

    await me.save();
    await other.save();

    return res.json({
      followed: false,
      followersCount: other.followers.length,
      followingCount: me.following.length
    });
  }

  /* 🔒 PRIVATE PROFILE → SEND REQUEST */
  if (other.isPrivate) {
    if (!other.followRequests.includes(me._id)) {
      other.followRequests.push(me._id);
      await other.save();

      const notif = await Notification.create({
        userId: other._id,
        fromUser: me._id,
        type: "follow_request",
        text: `${me.name} sent you a follow request`,
        link: `/profile.html?id=${me._id}`
      });

      /* 🔥 REALTIME */
      emitNotification(other._id, notif);
    }

    return res.json({ requested: true });
  }

  /* 🔓 PUBLIC PROFILE → DIRECT FOLLOW */
  me.following.push(other._id);
  other.followers.push(me._id);

  await me.save();
  await other.save();

  const notif = await Notification.create({
    userId: other._id,
    fromUser: me._id,
    type: "new_follower",
    text: `${me.name} started following you`,
    link: `/profile.html?id=${me._id}`
  });

  /* 🔥 REALTIME */
  emitNotification(other._id, notif);

  res.json({
    followed: true,
    followersCount: other.followers.length,
    followingCount: me.following.length
  });
});

/* ======================
   ACCEPT FOLLOW REQUEST
====================== */
router.post("/follow-accept/:id", auth, async (req, res) => {
  const me = await User.findById(req.user.id);
  const other = await User.findById(req.params.id);

  if (!other || !me.followRequests.includes(other._id)) {
    return res.status(400).json({ msg: "No request found" });
  }

  me.followRequests.pull(other._id);
  me.followers.push(other._id);
  other.following.push(me._id);

  await me.save();
  await other.save();

  const notif = await Notification.create({
    userId: other._id,
    fromUser: me._id,
    type: "follow_accept",
    text: `${me.name} accepted your follow request`,
    link: `/profile.html?id=${me._id}`
  });

  /* 🔥 REALTIME */
  emitNotification(other._id, notif);

  res.json({ accepted: true });
});

/* ======================
   REJECT FOLLOW REQUEST
====================== */
router.post("/follow-reject/:id", auth, async (req, res) => {
  const me = await User.findById(req.user.id);

  me.followRequests.pull(req.params.id);
  await me.save();

  res.json({ rejected: true });
});

/* ======================
   GET FOLLOWERS
====================== */
router.get("/:id/followers", auth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate("followers", "name profilePic");

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  res.json(user.followers);
});

/* ======================
   GET FOLLOWING
====================== */
router.get("/:id/following", auth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate("following", "name profilePic");

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

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
