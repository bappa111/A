// SOCKET
const socket = io();

// TOKEN
const token = localStorage.getItem("token");
if (!token) {
  alert("Please login first");
  window.location.href = "/";
}

// Decode my user id
const myId = JSON.parse(atob(token.split(".")[1])).id;

// join my room
socket.emit("join", myId);

// DOM
const usersDiv = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msg");

// STATE
let currentUserId = null;
let onlineUserIds = [];

/* ======================
   LOAD USERS
====================== */
async function loadUsers() {
  const res = await fetch("/api/users", {
    headers: { Authorization: "Bearer " + token }
  });

  const users = await res.json();
  usersDiv.innerHTML = "";

  users.forEach(u => {
    if (u._id === myId) return;

    const btn = document.createElement("button");
    btn.innerText = u.name;
    btn.dataset.id = u._id;
    btn.style.background = "lightgray"; // default offline

    btn.onclick = () => openChat(u._id);

    usersDiv.appendChild(btn);
    usersDiv.appendChild(document.createElement("br"));
  });

  updateUserStatus();
}

/* ======================
   OPEN CHAT
====================== */
async function openChat(userId) {
  currentUserId = userId;
  messagesDiv.innerHTML = "";

  localStorage.setItem("lastChatUser", userId);

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

/* ======================
   SEND MESSAGE
====================== */
async function sendMessage() {
  if (!currentUserId) {
    alert("Select a user");
    return;
  }

  const text = msgInput.value.trim();
  if (!text) return;

  // show instantly
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

/* ======================
   RECEIVE MESSAGE
====================== */
socket.on("receiveMessage", data => {
  if (data.senderId !== currentUserId) return;

  const p = document.createElement("p");
  p.innerText = "Them: " + data.message;
  messagesDiv.appendChild(p);
});

/* ======================
   ONLINE / OFFLINE
====================== */
socket.on("onlineUsers", users => {
  onlineUserIds = users;
  updateUserStatus();
});

function updateUserStatus() {
  document.querySelectorAll("#users button").forEach(btn => {
    const uid = btn.dataset.id;
    if (onlineUserIds.includes(uid)) {
      btn.style.background = "lightgreen"; // online
    } else {
      btn.style.background = "lightgray"; // offline
    }
  });
}

/* ======================
   INIT
====================== */
loadUsers();

const lastChatUser = localStorage.getItem("lastChatUser");
if (lastChatUser) {
  openChat(lastChatUser);
}
