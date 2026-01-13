const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  }
});

router.post("/image", upload.single("image"), async (req, res) => {
  try {
    console.log("IMAGE ROUTE HIT");

    if (!req.file) {
      console.log("NO FILE");
      return res.status(400).json({ msg: "No image uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chat_images"
    });

    return res.json({ imageUrl: result.secure_url });

  } catch (err) {
    console.error("UPLOAD ERROR", err);
    return res.status(500).json({ msg: "Upload failed" });
  }
});

// ======================
// VOICE UPLOAD
// ======================
router.post("/voice", upload.single("voice"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        resource_type: "video", // 🔥 audio = video in cloudinary
        folder: "chat_voice"
      }
    );

    res.json({ voiceUrl: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Voice upload failed" });
  }
});
module.exports = router;
