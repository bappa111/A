const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

/* ======================
   IMAGE UPLOAD (image only)
====================== */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  }
});

router.post("/image", imageUpload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No image uploaded" });

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chat_images"
    });

    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Image upload failed" });
  }
});

/* ======================
   VOICE UPLOAD (audio only)
====================== */
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post("/voice", voiceUpload.single("voice"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No voice uploaded" });

    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: "video", // audio = video in Cloudinary
      folder: "chat_voice"
    });

    res.json({ voiceUrl: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Voice upload failed" });
  }
});

module.exports = router;
