const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  content: String
}, { timestamps: true });

module.exports = mongoose.model("Post", PostSchema);
