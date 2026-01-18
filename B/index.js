const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

/* ======================
   DATABASE
====================== */
connectDB();

/* ======================
   MIDDLEWARE
====================== */
app.use(cors());
app.use(express.json());

/* ======================
   SERVE FRONTEND + UPLOADS
====================== */
app.use(express.static(path.join(__dirname, "public")));


/* ======================
   MEDIA ROUTES (IMAGE / FUTURE AUDIO)
====================== */
app.use("/api/media", require("./routes/mediaRoutes"));

/* ======================
   API ROUTES
====================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

/* ======================
   SOCKET
====================== */
const { initSocket } = require("./socket/socket");
initSocket(server);

/* ======================
   SERVER START
====================== */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
