const API = "http://localhost:9000";
let token = localStorage.getItem("token");
let currentChatUser = null;
let socket = null;

// LOGIN
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch(API + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  localStorage.setItem("token", data.token);
  window.location = "chat.html";
}

// LOAD USERS
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
    li.onclick = () => openChat(u);
    ul.appendChild(li);
  });
}

// OPEN CHAT
function openChat(user) {
  currentChatUser = user;
  document.getElementById("chatWith").innerText = "Chat with " + user.name;
  loadMessages();
}

// LOAD MESSAGES
async function loadMessages() {
  const res = await fetch(API + "/api/messages/" + currentChatUser._id, {
    headers: { Authorization: "Bearer " + token }
  });
  const msgs = await res.json();
  const box = document.getElementById("messages");
  box.innerHTML = "";
  msgs.forEach(m => {
    box.innerHTML += `<p>${m.message}</p>`;
  });
}

// SEND MESSAGE
async function sendMessage() {
  const message = document.getElementById("msg").value;
  await fetch(API + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentChatUser._id,
      message
    })
  });
  document.getElementById("msg").value = "";
  loadMessages();
}

// SOCKET CONNECT
if (token && location.pathname.includes("chat")) {
  socket = io(API, {
    query: { userId: JSON.parse(atob(token.split(".")[1])).id }
  });

  socket.on("online-users", () => loadUsers());
  socket.on("private-message", () => loadMessages());

  loadUsers();
}
