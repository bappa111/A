const API = "https://a-kisk.onrender.com";

let token = localStorage.getItem("token");
let currentUser = null;
let socket = null;
let selectedImageFile = null;

let mediaRecorder = null;
let audioChunks = [];

/* ======================
   LOGIN
====================== */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Email & password required");
    return;
  }

  const res = await fetch(API + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!data.token) {
    alert("Login failed");
    return;
  }

  localStorage.setItem("token", data.token);
  token = data.token;
  location.href = "feed.html";
}

/* ======================
   LOAD USERS
====================== */
async function loadUsers() {
  const ul = document.getElementById("users");
  if (!ul) return;

  const res = await fetch(API + "/api/users", {
    headers: { Authorization: "Bearer " + token }
  });

  const users = await res.json();
  ul.innerHTML = "";

  users.forEach(u => {
    const li = document.createElement("li");
    li.innerText = u.name;
    li.style.cursor = "pointer";
    li.onclick = () => openChat(u);
    ul.appendChild(li);
  });
}

/* ======================
   LOAD FRIENDS
====================== */
async function loadFriends() {
  const ul = document.getElementById("friends");
  if (!ul) return;

  const res = await fetch(API + "/api/users/friends", {
    headers: { Authorization: "Bearer " + token }
  });

  const friends = await res.json();
  ul.innerHTML = "";

  friends.forEach(u => {
    const li = document.createElement("li");
    li.innerText = u.name;
    li.style.cursor = "pointer";
    li.onclick = () => openChat(u);
    ul.appendChild(li);
  });
}

/* ======================
   OPEN CHAT
====================== */
function openChat(user) {
  currentUser = user;

  const h = document.getElementById("chatWith");
  if (h) h.innerText = "Chat with " + (user.name || "User");

  markSeen();     // ✅ IMPORTANT
  loadMessages();
}

/* ======================
   LOAD MESSAGES
====================== */
async function loadMessages() {
  if (!currentUser) return;

  const res = await fetch(
    API + "/api/messages/" + currentUser._id,
    { headers: { Authorization: "Bearer " + token } }
  );

  const msgs = await res.json();
  const box = document.getElementById("messages");
  if (!box) return;

  box.innerHTML = "";

  msgs.forEach(m => {
    const wrap = document.createElement("div");
    wrap.style.border = "1px solid #ddd";
    wrap.style.padding = "6px";
    wrap.style.marginBottom = "6px";

    const isMine = m.senderId?.toString() === getMyUserId();

    if (m.message) {
      const p = document.createElement("p");
      p.innerText = m.message;
      wrap.appendChild(p);
    }

    if (m.image) {
      const img = document.createElement("img");
      img.src = m.image;
      img.style.maxWidth = "200px";
      wrap.appendChild(img);
    }

    if (m.voice) {
      const audio = document.createElement("audio");
      audio.src = m.voice;
      audio.controls = true;
      wrap.appendChild(audio);
    }

    if (m.video) {
      const video = document.createElement("video");
      video.src = m.video;
      video.controls = true;
      video.style.maxWidth = "250px";
      wrap.appendChild(video);
    }

    if (isMine) {
      const status = document.createElement("small");
      status.style.display = "block";
      status.innerText = m.seen
        ? "✔✔ Seen"
        : m.delivered
        ? "✔✔ Delivered"
        : "✔ Sent";
      wrap.appendChild(status);
    }

    box.appendChild(wrap);
  });
}

/* ======================
   MARK SEEN (IMPORTANT)
====================== */
async function markSeen() {
  if (!currentUser) return;

  await fetch(API + "/api/messages/seen/" + currentUser._id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
}

/* ======================
   HELPERS
====================== */
function getMyUserId() {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.id;
}

async function openChatFromProfile(userId) {
  const res = await fetch(API + "/api/users/profile/" + userId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  if (!data.user) return;

  openChat({
    _id: data.user._id,
    name: data.user.name
  });
}
/* ======================
   SEND TEXT
====================== */
async function sendMessage() {
  if (!currentUser) return;

  const msgInput = document.getElementById("msg");
  const text = msgInput.value.trim();
  if (!text) return;

  await fetch(API + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUser._id,
      message: text
    })
  });

  msgInput.value = "";
  loadMessages();
}

/* ======================
   SOCKET INIT
====================== */
if (token && location.pathname.includes("chat.html")) {
  let payload;
  try {
    payload = JSON.parse(atob(token.split(".")[1]));
  } catch {
    localStorage.removeItem("token");
    location.href = "index.html";
  }

  socket = io(API, { query: { userId: payload.id } });
  socket.on("private-message", loadMessages);

  const params = new URLSearchParams(location.search);
  const otherUserId = params.get("userId");

  if (otherUserId) {
    // 🔒 Profile → Direct chat //
    const usersDiv = document.getElementById("users");
    if (usersDiv) usersDiv.style.display = "none";

    openChatFromProfile(otherUserId);
  } else {
    // 📋 Normal chat page//
    loadFriends();   // ✅ থাকবে
    loadUsers();     // ✅ থাকবে
  }
}
