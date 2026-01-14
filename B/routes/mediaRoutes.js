const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

/* ======================
   IMAGE UPLOAD
====================== */
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  }
});

router.post("/image", uploadImage.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No image uploaded" });
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "chat_images" }
    );

    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error("IMAGE UPLOAD ERROR:", err);
    res.status(500).json({ msg: "Image upload failed" });
  }
});

/* ======================
   VOICE UPLOAD
====================== */
const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post("/voice", uploadAny.single("voice"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No voice file" });
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        resource_type: "video", // audio handled as video
        folder: "chat_voice"
      }
    );

    res.json({ voiceUrl: result.secure_url });
  } catch (err) {
    console.error("VOICE UPLOAD ERROR:", err);
    res.status(500).json({ msg: "Voice upload failed" });
  }
});

/* ======================
   VIDEO UPLOAD
====================== */
router.post("/video", uploadAny.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No video file" });
    }

    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        resource_type: "video",
        folder: "chat_videos"
      }
    );

    res.json({ videoUrl: result.secure_url });
  } catch (err) {
    console.error("VIDEO UPLOAD ERROR:", err);
    res.status(500).json({ msg: "Video upload failed" });
  }
});

module.exports = router;
