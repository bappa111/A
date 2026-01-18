const express = require("express");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

/* ======================
   CREATE POST
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
  const myId = req.user.id;

  const posts = await Post.find()
    .populate("userId", "name profilePic followers")
    .sort({ createdAt: -1 })
    .lean();

  const formatted = posts.map(p => {
    const followedBy = (p.userId.followers || [])
      .filter(u => u._id.toString() !== myId)
      .slice(0, 2)
      .map(u => u.name);

    return { ...p, followedBy };
  });

  res.json(formatted);
});

/* ======================
   LIKE / UNLIKE
====================== */
router.post("/:id/like", auth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ msg: "Post not found" });

  const userId = req.user.id;
  const index = post.likes.indexOf(userId);

  if (index === -1) {
    post.likes.push(userId);

    if (post.userId.toString() !== userId) {
      await Notification.create({
        userId: post.userId,
        fromUser: userId,
        type: "like",
        text: "Someone liked your post",
        link: `/profile.html?id=${userId}`
      });
    }
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

  if (post.userId.toString() !== req.user.id) {
    await Notification.create({
      userId: post.userId,
      fromUser: req.user.id,
      type: "comment",
      text: "Someone commented on your post",
      link: `/profile.html?id=${req.user.id}`
    });
  }

  res.json(post.comments);
});

/* ======================
   DELETE POST
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
