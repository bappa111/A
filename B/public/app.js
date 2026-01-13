const API = "https://a-kisk.onrender.com";

let token = localStorage.getItem("token");
let currentUser = null;
let socket = null;
let selectedImageFile = null;

let mediaRecorder;
let audioChunks = [];

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
   LOAD MESSAGES
====================== */
async function loadMessages() {
  if (!currentUser) return;

  const res = await fetch(API + "/api/messages/" + currentUser._id, {
    headers: { Authorization: "Bearer " + token }
  });
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
      box.appendChild(img);
    }

    if (m.voice) {
      const audio = document.createElement("audio");
      audio.src = m.voice;
      audio.controls = true;
      box.appendChild(audio);
    }
  });
}

/* ======================
   SEND TEXT
====================== */
async function sendMessage() {
  const text = msg.value.trim();
  if (!text || !currentUser) return;

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

  msg.value = "";
  loadMessages();
}

/* ======================
   IMAGE PICK
====================== */
function handleImageChange(e) {
  selectedImageFile = e.target.files[0];
  if (!selectedImageFile) return;
  sendImage();
  e.target.value = "";
}

/* ======================
   SEND IMAGE
====================== */
async function sendImage() {
  if (!selectedImageFile || !currentUser) return;

  const formData = new FormData();
  formData.append("image", selectedImageFile);

  const uploadRes = await fetch(API + "/api/media/image", {
    method: "POST",
    body: formData
  });
  const data = await uploadRes.json();

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

  loadMessages();
}

/* ======================
   VOICE RECORD
====================== */
async function startVoice() {
  if (!currentUser) return;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];

  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = uploadVoice;

  mediaRecorder.start();
  alert("🎙️ Recording...");
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

  const res = await fetch(API + "/api/media/voice", {
    method: "POST",
    body: formData
  });
  const data = await res.json();

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

  loadMessages();
}

/* ======================
   SOCKET
====================== */
if (token) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  socket = io(API, { query: { userId: payload.id } });
  socket.on("private-message", loadMessages);
  loadUsers();
}
