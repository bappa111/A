const express = require("express");
const auth = require("../../middleware/authMiddleware");
const PersonalPost = require("../models/PersonalPost");
const Access = require("../models/PersonalAccessRequest");

const router = express.Router();

/* ======================
   CREATE PERSONAL POST (OWNER ONLY)
====================== */
router.post("/", auth, async (req, res) => {
  try {
    const approved = await Access.find({
      owner: req.user.id,
      status: "approved"
    }).select("requester");

    const allowedUsers = approved.map(a => a.requester);

    const post = await PersonalPost.create({
      owner: req.user.id,
      content: req.body.content || "",
      image: req.body.image || null,
      video: req.body.video || null,
      allowedUsers
    });

    res.json(post);
  } catch (e) {
    res.status(500).json({ msg: "Create failed" });
  }
});

/* ======================
   GET PERSONAL POSTS
====================== */
router.get("/:ownerId", auth, async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const me = req.user.id;

    let query;
    if (me === ownerId) {
      query = { owner: ownerId }; // owner sees all
    } else {
      query = { owner: ownerId, allowedUsers: me };
    }

    const posts = await PersonalPost.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (e) {
    res.status(500).json([]);
  }
});

/* ======================
   UPDATE PERSONAL POST
====================== */
router.put("/:id", auth, async (req, res) => {
  const post = await PersonalPost.findById(req.params.id);

  if (!post || post.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  post.content = req.body.content ?? post.content;
  post.image = req.body.image ?? post.image;
  post.video = req.body.video ?? post.video;

  await post.save();
  res.json({ ok: true });
});

/* ======================
   DELETE PERSONAL POST
====================== */
router.delete("/:id", auth, async (req, res) => {
  const post = await PersonalPost.findById(req.params.id);

  if (!post || post.owner.toString() !== req.user.id) {
    return res.status(403).json({ msg: "Not allowed" });
  }

  await post.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
