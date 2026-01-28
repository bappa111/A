const express = require("express");
const auth = require("../../middleware/authMiddleware");
const PersonalPost = require("../models/PersonalPost");
const Access = require("../models/PersonalAccessRequest");

const router = express.Router();

/* =====================================================
   GET ALL ACCESS LIST (OWNER ONLY)
   - pending / approved / rejected সব একসাথে
===================================================== */
router.get("/all", auth, async (req, res) => {
  try {
    const list = await Access.find({ owner: req.user.id })
      .populate("requester", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

/* =====================================================
   REMOVE ACCESS (OWNER ONLY)
   - approved user remove করলে সব post থেকে access যাবে
===================================================== */
router.post("/remove/:requesterId", auth, async (req, res) => {
  try {
    const requesterId = req.params.requesterId;

    // access record delete
    await Access.deleteOne({
      owner: req.user.id,
      requester: requesterId
    });

    // personal post থেকে remove
    await PersonalPost.updateMany(
      { owner: req.user.id },
      { $pull: { allowedUsers: requesterId } }
    );

    res.json({ removed: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Remove access failed" });
  }
});

/* =====================================================
   CREATE PERSONAL POST (OWNER ONLY)
===================================================== */
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
    console.error(e);
    res.status(500).json({ msg: "Personal post create failed" });
  }
});

/* =====================================================
   GET PERSONAL POSTS
   - owner → সব post
   - approved user → allowedUsers match
===================================================== */
router.get("/:ownerId", auth, async (req, res) => {
  try {
    const ownerId = req.params.ownerId;
    const me = req.user.id;

    let query;

    if (me === ownerId) {
      // owner sees all
      query = { owner: ownerId };
    } else {
      // approved user only
      query = {
        owner: ownerId,
        allowedUsers: me
      };
    }

    const posts = await PersonalPost.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

/* =====================================================
   UPDATE PERSONAL POST (OWNER ONLY)
===================================================== */
router.put("/:id", auth, async (req, res) => {
  try {
    const post = await PersonalPost.findById(req.params.id);

    if (!post || post.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    post.content = req.body.content ?? post.content;
    post.image = req.body.image ?? post.image;
    post.video = req.body.video ?? post.video;

    await post.save();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Update failed" });
  }
});

/* =====================================================
   DELETE PERSONAL POST (OWNER ONLY)
===================================================== */
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await PersonalPost.findById(req.params.id);

    if (!post || post.owner.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    await post.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: "Delete failed" });
  }
});

module.exports = router;
