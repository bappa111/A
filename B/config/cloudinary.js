const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.da2ys4dbs,
  api_key: process.env.668465511686423,
  api_secret: process.env._av9XVF4Il-qSLMw98w6ZwdRbuU
});

module.exports = cloudinary;
