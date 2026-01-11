// SOCKET
const socket = io();

// TOKEN (একবারই)
const token = localStorage.getItem("token");
if (!token) {
  alert("Please login first");
  window.location.href = "/";
}

// Decode my user id from token
const myId = JSON.parse(atob(token.split(".")[1])).id;

// join my own room
socket.emit("join", myId);

// DOM
const usersDiv = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msg");

// STATE
let currentUserId = null;

// LOAD USERS
async function loadUsers() {
  const res = await fetch("/api/users", {
    headers: {
      Authorization: "Bearer " + token
    }
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

// OPEN CHAT
async function openChat(userId) {
  currentUserId = userId;

  const res = await fetch(`/api/chat/${userId}`, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const chats = await res.json();
  messagesDiv.innerHTML = "";

  chats.forEach(c => {
    const p = document.createElement("p");
    p.innerText =
      (c.senderId === userId ? "Them: " : "Me: ") + c.message;
    messagesDiv.appendChild(p);
  });
}

// SEND MESSAGE
async function sendMessage() {
  if (!currentUserId) {
    alert("Select a user");
    return;
  }

  const text = msgInput.value;
  if (!text) return;

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
    message: text
  });

  msgInput.value = "";
}

// RECEIVE MESSAGE (personal)
socket.on("receiveMessage", data => {
  const p = document.createElement("p");
  p.innerText = "Them: " + data.message;
  messagesDiv.appendChild(p);
});

// INIT
loadUsers();
