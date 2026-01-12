const API = "https://a-kisk.onrender.com";

let token = localStorage.getItem("token");
let currentUser = null;
let socket = null;

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
    window.location.href = "index.html";
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

  window.location.href = "chat.html";
}

/* ======================
   LOAD USERS
====================== */
async function loadUsers() {
  const res = await fetch(API + "/api/users", {
    headers: {
      Authorization: "Bearer " + token
    }
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
   LOAD MESSAGES (TEXT + IMAGE SAFE)
====================== */
async function loadMessages() {
  if (!currentUser) return;

  const res = await fetch(
    API + "/api/messages/" + currentUser._id,
    {
      headers: {
        Authorization: "Bearer " + token
      }
    }
  );

  const msgs = await res.json();

  const box = document.getElementById("messages");
  box.innerHTML = "";

  msgs.forEach(m => {

    // ✅ TEXT MESSAGE (old system safe)
    if (m.message) {
      const p = document.createElement("p");
      p.innerText = m.message;
      box.appendChild(p);
    }

    // ✅ IMAGE MESSAGE (new system safe)
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
   3 DOT MENU
====================== */
function toggleMenu() {
  const menu = document.getElementById("mediaMenu");
  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
}

function openImage() {
  document.getElementById("imageInput").click();
  document.getElementById("mediaMenu").style.display = "none";
}
/* ======================
   IMAGE INPUT HANDLER
====================== */
function handleImageChange(e) {
  const input = e.target;

  if (!input.files || !input.files[0]) return;

  sendImage();

  // 🔁 allow same image to be sent again
  input.value = "";
}

/* ======================
   SEND TEXT MESSAGE
====================== */
async function sendMessage() {
  if (!currentUser) {
    alert("Select a user first");
    return;
  }

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
   SEND IMAGE
===================== */
function handleImageChange(e) {
  const file = e.target.files[0];
  if (!file || !currentUser) return;

  uploadImage(file);

  // same image again allow
  e.target.value = "";
}

async function uploadImage(file) {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const uploadRes = await fetch(API + "/api/media/image", {
      method: "POST",
      body: formData
    });

    const data = await uploadRes.json();

    if (!data.imageUrl) {
      alert("Upload failed");
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

    // realtime notify
    if (socket) {
      socket.emit("private-message", {
        to: currentUser._id,
        image: data.imageUrl
      });
    }

    loadMessages();

  } catch (err) {
    console.error(err);
    alert("Image send failed");
  }
}
 
/* ======================
   SOCKET (REAL-TIME)
====================== */
if (token && window.location.pathname.includes("chat")) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  const userId = payload.id;

  socket = io(API, {
    query: { userId }
  });

  socket.on("online-users", () => {
    loadUsers();
  });

  socket.on("private-message", () => {
    loadMessages();
  });

  loadUsers();

  // 🔁 Restore last open chat after reload
  const last = localStorage.getItem("lastChatUser");
  if (last) {
    openChat(JSON.parse(last));
  }
}
