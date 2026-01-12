
const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

/* ======================
   MULTER CONFIG
   (memory only, no disk)
====================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"), false);
    }
  }
});

/* ======================
   IMAGE UPLOAD ROUTE
====================== */
router.post("/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: "No image uploaded" });
    }

    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chat_images"
    });

    res.json({
      imageUrl: result.secure_url
    });

  } catch (err) {
    console.error("Cloudinary error:", err);
    res.status(500).json({ msg: "Image upload failed" });
  }
});

module.exports = router;
