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
  token = data.token; // 🔥 IMPORTANT FIX

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
   LOAD MESSAGES
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
    const p = document.createElement("p");
    p.innerText = m.message;
    box.appendChild(p);
  });
}

/* ======================
   SEND MESSAGE
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
}
