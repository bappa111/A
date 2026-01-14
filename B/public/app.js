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
  location.href = "chat.html";
}

/* ======================
   LOAD USERS
====================== */
async function loadUsers() {
  const res = await fetch(API + "/api/users", {
    headers: { Authorization: "Bearer " + token }
  });

  const users = await res.json();
  const ul = document.getElementById("users");
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
   OPEN CHAT
====================== */
function openChat(user) {
  currentUser = user;
  document.getElementById("chatWith").innerText =
    "Chat with " + user.name;
  loadMessages();
}

/* ======================
   LOAD MESSAGES (TEXT + IMAGE + VOICE + DELETE)
====================== */
async function loadMessages() {
  if (!currentUser) return;

  const res = await fetch(
    API + "/api/messages/" + currentUser._id,
    { headers: { Authorization: "Bearer " + token } }
  );

  const msgs = await res.json();
  const box = document.getElementById("messages");
  box.innerHTML = "";

  msgs.forEach(m => {
    const wrap = document.createElement("div");
    wrap.style.marginBottom = "8px";

    if (m.message) {
      const p = document.createElement("p");
      p.innerText = m.message;
      wrap.appendChild(p);
    }

    if (m.image) {
      const img = document.createElement("img");
      img.src = m.image;
      img.style.maxWidth = "200px";
      img.style.display = "block";
      wrap.appendChild(img);
    }

    if (m.voice) {
      const audio = document.createElement("audio");
      audio.src = m.voice;
      audio.controls = true;
      audio.style.display = "block";
      wrap.appendChild(audio);
    }

    // 🗑️ delete only own message
    if (m.senderId === getMyUserId()) {
      const del = document.createElement("button");
      del.innerText = "🗑️";
      del.onclick = () => deleteMessage(m._id);
      wrap.appendChild(del);
    }

    box.appendChild(wrap);
  });
}

/* ======================
   HELPERS
====================== */
function getMyUserId() {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return payload.id;
}

async function deleteMessage(id) {
  if (!confirm("Delete this message?")) return;

  await fetch(API + "/api/messages/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  loadMessages();
}

/* ======================
   SEND TEXT
====================== */
async function sendMessage() {
  if (!currentUser) return;

  const msgInput = document.getElementById("msg");
  const text = msgInput.value.trim();
  if (!text) return;

  const res = await fetch(API + "/api/messages", {
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

  const msg = await res.json();
  if (socket) socket.emit("private-message", msg);

  msgInput.value = "";
  loadMessages();
}

/* ======================
   IMAGE PICK
====================== */
function handleImageChange(e) {
  selectedImageFile = e.target.files[0];
  if (!selectedImageFile || !currentUser) return;
  sendImage();
  e.target.value = "";
}

/* ======================
   SEND IMAGE
====================== */
async function sendImage() {
  try {
    const formData = new FormData();
    formData.append("image", selectedImageFile);

    const uploadRes = await fetch(API + "/api/media/image", {
      method: "POST",
      body: formData
    });

    const data = await uploadRes.json();
    if (!data.imageUrl) {
      alert("Image upload failed");
      return;
    }

    const res = await fetch(API + "/api/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        receiverId: currentUser._id,
        image: data.imageUrl
      })
    });

    const msg = await res.json();
    if (socket) socket.emit("private-message", msg);

    selectedImageFile = null;
    loadMessages();
  } catch (err) {
    alert("Image send failed");
  }
}

/* ======================
   VOICE RECORD
====================== */
async function startVoice() {
  if (!currentUser) return;

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    alert("Voice not supported");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = uploadVoice;

    mediaRecorder.start();
    alert("🎙️ Recording...");
  } catch {
    alert("Mic permission denied");
  }
}

function stopVoice() {
  if (mediaRecorder) mediaRecorder.stop();
}

/* ======================
   UPLOAD VOICE
====================== */
async function uploadVoice() {
  const blob = new Blob(audioChunks, { type: "audio/webm" });
  const formData = new FormData();
  formData.append("voice", blob);

  const uploadRes = await fetch(API + "/api/media/voice", {
    method: "POST",
    body: formData
  });

  const data = await uploadRes.json();
  if (!data.voiceUrl) {
    alert("Voice upload failed");
    return;
  }

  const res = await fetch(API + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUser._id,
      voice: data.voiceUrl
    })
  });

  const msg = await res.json();
  if (socket) socket.emit("private-message", msg);

  loadMessages();
}

/* ======================
   SOCKET
====================== */
if (token && location.pathname.includes("chat")) {
  let payload;
  try {
    payload = JSON.parse(atob(token.split(".")[1]));
  } catch {
    localStorage.removeItem("token");
    location.href = "index.html";
  }

  socket = io(API, { query: { userId: payload.id } });
  socket.on("private-message", loadMessages);
  loadUsers();
}
