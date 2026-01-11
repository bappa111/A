const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// GET all users except me
router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user.id } },
      { password: 0 } // password বাদ
    );
    res.json(users);
  } catch (e) {
    res.status(500).json({ msg: "Failed to load users" });
  }
});

module.exports = router;
