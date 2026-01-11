require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

connectDB();

app.use(express.json());
app.use(require("cors")());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/post"));
app.use("/api/users", require("./routes/users"));
app.use("/api/chat", require("./routes/chat"));

require("./socket/socket")(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running"));
