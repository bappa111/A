const API = "https://a-kisk.onrender.com";
let token = localStorage.getItem("token");
let currentUser = null;
let socket;

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
  location.href = "chat.html";
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

function openChat(user) {
  currentUser = user;
  document.getElementById("chatWith").innerText = "Chat with " + user.name;
  loadMessages();
}

async function loadMessages() {
  const res = await fetch(API + "/api/messages/" + currentUser._id, {
    headers: { Authorization: "Bearer " + token }
  });
  const msgs = await res.json();

  const box = document.getElementById("messages");
  box.innerHTML = "";
  msgs.forEach(m => box.innerHTML += `<p>${m.message}</p>`);
}

async function sendMessage() {
  await fetch(API + "/api/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUser._id,
      message: msg.value
    })
  });
  msg.value = "";
  loadMessages();
}

// SOCKET
if (location.pathname.includes("chat")) {
  const userId = JSON.parse(atob(token.split(".")[1])).id;

  socket = io(API, { query: { userId } });
  socket.on("online-users", loadUsers);
  socket.on("private-message", loadMessages);

  loadUsers();
}
