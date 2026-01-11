const socket = io();

/* =====================
   AUTH
===================== */
const token = localStorage.getItem("token");
if (!token) {
  alert("Login first");
  window.location.href = "/";
}

const myId = JSON.parse(atob(token.split(".")[1])).id;

/* =====================
   SOCKET JOIN (IMPORTANT)
===================== */
socket.on("connect", () => {
  socket.emit("join", myId);
});

/* =====================
   DOM
===================== */
const usersDiv = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msg");

let currentUserId = null;

/* =====================
   LOAD USERS
===================== */
async function loadUsers() {
  const res = await fetch("/api/users", {
    headers: { Authorization: "Bearer " + token }
  });

  const users = await res.json();
  usersDiv.innerHTML = "";

  users.forEach(u => {
    if (u._id === myId) return; // ❌ নিজেকে বাদ

    const btn = document.createElement("button");
    btn.innerText = u.name;
    btn.onclick = () => openChat(u._id);

    usersDiv.appendChild(btn);
    usersDiv.appendChild(document.createElement("br"));
  });
}

/* =====================
   OPEN CHAT
===================== */
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

/* =====================
   SEND MESSAGE
===================== */
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

/* =====================
   RECEIVE MESSAGE (FIXED)
===================== */
socket.on("receiveMessage", data => {
  // ❗ only show if current chat open
  if (data.senderId !== currentUserId) return;

  const p = document.createElement("p");
  p.innerText = "Them: " + data.message;
  messagesDiv.appendChild(p);
});

/* =====================
   INIT
===================== */
loadUsers();
