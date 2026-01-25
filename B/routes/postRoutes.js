const express = require("express");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

/* 🔥 REALTIME SOCKET */
const { getIO } = require("../socket/socket");

const router = express.Router();

/* ======================
   REALTIME HELPER
====================== */
function emitNotification(userId, notification) {
  try {
    const io = getIO();
    if (!io) return;
    io.to(userId.toString()).emit("notification", notification);
  } catch (e) {
    console.log("Post realtime error:", e.message);
  }
}

/* ======================
   CREATE POST
====================== */
router.post("/", auth, async (req, res) => {
  try {
    const { content, image, video } = req.body;

    const post = await Post.create({
      userId: req.user.id,
      content: content || "",
      image: image || null,
      video: video || null
      // ❌ createdAt manually দিচ্ছি না (timestamps handles it)
    });

    res.json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Post create failed" });
  }
});

/* ======================
   GET FEED (PAGINATED)
====================== */
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1");
    const limit = 5;
    const skip = (page - 1) * limit;
    const myId = req.user.id;

    const posts = await Post.find()
      .populate("userId", "name profilePic followers")
      .sort({ _id: -1 }) // 🔥 STABLE SORT
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = posts.map(p => {
      const followedBy = (p.userId.followers || [])
        .filter(u => u._id.toString() !== myId)
        .slice(0, 2)
        .map(u => u.name);

      return { ...p, followedBy };
    });

    res.json(formatted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Feed load failed" });
  }
});

/* ======================
   LIKE / UNLIKE
====================== */
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const userId = req.user.id;
    const index = post.likes.indexOf(userId);

    if (index === -1) {
      post.likes.push(userId);

      if (post.userId.toString() !== userId) {
        const notif = await Notification.create({
          userId: post.userId,
          fromUser: userId,
          type: "like",
          text: "Someone liked your post",
          link: `/feed.html?post=${post._id}`
        });

        emitNotification(post.userId, notif);
      }
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.json({ likes: post.likes.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Like failed" });
  }
});

/* ======================
   ADD COMMENT
====================== */
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    post.comments.push({
      userId: req.user.id,
      text: req.body.text
    });

    await post.save();

    if (post.userId.toString() !== req.user.id) {
      const notif = await Notification.create({
        userId: post.userId,
        fromUser: req.user.id,
        type: "comment",
        text: "Someone commented on your post",
        link: `/feed.html?post=${post._id}`
      });

      emitNotification(post.userId, notif);
    }

    res.json(post.comments);
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Comment failed" });
  }
});

/* ======================
   DELETE POST
====================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.userId.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    await post.deleteOne();
    res.json({ msg: "Post deleted" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Delete failed" });
  }
});

module.exports = router;
