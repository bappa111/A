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

//registered//
async function register() {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !password) {
    alert("All fields required");
    return;
  }

  const res = await fetch("https://a-kisk.onrender.com/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.msg || "Register failed");
    return;
  }

  alert("Registered successfully. Login now.");
  location.href = "index.html";
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

  markSeen();     // ✅ IMPORTANT//
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

  // 🔥 notify sender in real-time
  if (socket) {
    socket.emit("message-seen", {
      senderId: currentUser._id
    });
  }
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

  socket.on("message-seen", () => {
  loadMessages();
});
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


function uploadWithProgress({ url, file, field }) {
  return new Promise((resolve, reject) => {
    const overlay = document.getElementById("uploadOverlay");
    const percentText = document.getElementById("uploadPercent");

    overlay.style.display = "flex";
    percentText.innerText = "0%";

    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append(field, file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        percentText.innerText = percent + "%";
      }
    };

    xhr.onload = () => {
      overlay.style.display = "none";
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        alert("Upload failed");
        reject();
      }
    };

    xhr.onerror = () => {
      overlay.style.display = "none";
      alert("Upload error");
      reject();
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.send(fd);
  });
}


async function handleImageChange(e) {
  if (!currentUser) return;

  const file = e.target.files[0];
  if (!file) return;

  const res = await uploadWithProgress({
    url: API + "/api/media/image",
    file,
    field: "image"
  });

  await fetch(API + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUser._id,
      image: res.imageUrl
    })
  });

  e.target.value = "";
  loadMessages();
}

async function handleVideoChange(e) {
  if (!currentUser) return;

  const file = e.target.files[0];
  if (!file) return;

  const res = await uploadWithProgress({
    url: API + "/api/media/video",
    file,
    field: "video"
  });

  await fetch(API + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUser._id,
      video: res.videoUrl
    })
  });

  e.target.value = "";
  loadMessages();
}
