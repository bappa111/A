const socket = io();

// TOKEN
const token = localStorage.getItem("token");
if (!token) {
  alert("Login first");
  window.location.href = "/";
}

// decode user id
const myId = JSON.parse(atob(token.split(".")[1])).id;

// join room AFTER connect
socket.on("connect", () => {
  socket.emit("join", myId);
});

// DOM
const usersDiv = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msg");

let currentUserId = null;

// LOAD USERS
async function loadUsers() {
  const res = await fetch("/api/users", {
    headers: { Authorization: "Bearer " + token }
  });
  const users = await res.json();

  usersDiv.innerHTML = "";

  users.forEach(u => {
    const btn = document.createElement("button");
    btn.innerText = u.name;
    btn.onclick = () => openChat(u._id);
    usersDiv.appendChild(btn);
    usersDiv.appendChild(document.createElement("br"));
  });
}

async function openChat(userId) {
  currentUserId = userId;
  messagesDiv.innerHTML = "";

  const res = await fetch(`/api/chat/${userId}`, {
    headers: { Authorization: "Bearer " + token }
  });
  const chats = await res.json();

  chats.forEach(c => {
    const p = document.createElement("p");
    p.innerText =
      (c.senderId === myId ? "Me: " : "Them: ") + c.message;
    messagesDiv.appendChild(p);
  });
}

async function sendMessage() {
  if (!currentUserId) return alert("Select user");

  const text = msgInput.value.trim();
  if (!text) return;

  const p = document.createElement("p");
  p.innerText = "Me: " + text;
  messagesDiv.appendChild(p);

  await fetch("/api/chat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUserId,
      message: text
    })
  });

  socket.emit("sendMessage", {
    receiverId: currentUserId,
    senderId: myId,
    message: text
  });

  msgInput.value = "";
}

socket.on("receiveMessage", data => {
  const p = document.createElement("p");
  p.innerText = "Them: " + data.message;
  messagesDiv.appendChild(p);
});

// INIT
loadUsers();
