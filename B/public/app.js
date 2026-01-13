const API = "https://a-kisk.onrender.com";

let token = localStorage.getItem("token");
let currentUser = null;
let socket = null;
let selectedImageFile = null;

/* ======================
   REGISTER
====================== */
async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!name || !email || !password) {
    alert("All fields required");
    return;
  }

  const res = await fetch(API + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();

  if (data.msg === "Registered") {
    alert("Registered successfully. Login now.");
    location.href = "index.html";
  } else {
    alert(data.msg || "Register failed");
  }
}

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
    li.innerText = u.name + (u.isOnline ? " 🟢" : " 🔴");
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
  localStorage.setItem("lastChatUser", JSON.stringify(user));
  document.getElementById("chatWith").innerText =
    "Chat with " + user.name;
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
  box.innerHTML = "";

  msgs.forEach(m => {
    if (m.message) {
      const p = document.createElement("p");
      p.innerText = m.message;
      box.appendChild(p);
    }

    if (m.image) {
      const img = document.createElement("img");
      img.src = m.image;
      img.style.maxWidth = "200px";
      img.style.display = "block";
      img.style.margin = "5px 0";
      box.appendChild(img);
    }
  });
}

/* ======================
   IMAGE PICK (PREVIEW)
====================== */
function handleImageChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  selectedImageFile = file;

  const previewBox = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");

  previewImg.src = URL.createObjectURL(file);
  previewBox.style.display = "block";

  e.target.value = "";
}

/* ======================
   CANCEL IMAGE
====================== */
function cancelImage() {
  selectedImageFile = null;
  document.getElementById("imagePreview").style.display = "none";
}

/* ======================
   SEND IMAGE
====================== */
async function sendImage() {
  if (!selectedImageFile || !currentUser) return;

  alert("⬆️ Uploading image...");

  try {
    const formData = new FormData();
    formData.append("image", selectedImageFile);

    const uploadRes = await fetch(API + "/api/media/image", {
      method: "POST",
      body: formData
    });

    const data = await uploadRes.json();

    if (!data.imageUrl) {
      alert("❌ Upload failed");
      return;
    }

    await fetch(API + "/api/messages", {
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

    alert("✅ Image sent");

    selectedImageFile = null;
    document.getElementById("imagePreview").style.display = "none";
    loadMessages();

  } catch (err) {
    console.error(err);
    alert("❌ Image send failed");
  }
}

/* ======================
   SEND TEXT MESSAGE
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
let mediaRecorder;
let audioChunks = [];

/* ======================
   START RECORD
====================== */
async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => {
    audioChunks.push(e.data);
  };

  mediaRecorder.onstop = uploadVoice;

  mediaRecorder.start();
  alert("🎙️ Recording...");
}

/* ======================
   STOP RECORD
====================== */
function stopRecording() {
  if (mediaRecorder) {
    mediaRecorder.stop();
    alert("⏹️ Recording stopped");
  }
}

/* ======================
   UPLOAD VOICE
====================== */
async function uploadVoice() {
  const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

  const formData = new FormData();
  formData.append("voice", audioBlob);

  const res = await fetch(API + "/api/media/voice", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!data.voiceUrl) {
    alert("Voice upload failed");
    return;
  }

  await fetch(API + "/api/messages", {
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

  alert("🎤 Voice sent");
  loadMessages();
if (m.voice) {
  const audio = document.createElement("audio");
  audio.src = m.voice;
  audio.controls = true;
  box.appendChild(audio);
}
}

/* ======================
   SOCKET
====================== */
if (token && location.pathname.includes("chat")) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  socket = io(API, { query: { userId: payload.id } });

  socket.on("online-users", loadUsers);
  socket.on("private-message", loadMessages);

  loadUsers();

  const last = localStorage.getItem("lastChatUser");
  if (last) openChat(JSON.parse(last));
}
