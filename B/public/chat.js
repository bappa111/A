// ======================
// SOCKET
// ======================
const socket = io();

// ======================
// TOKEN & USER
// ======================
const token = localStorage.getItem("token");
if (!token) {
  alert("Please login first");
  window.location.href = "/";
}

const myId = JSON.parse(atob(token.split(".")[1])).id;
//===================
//socket
//===================
   socket.on("connect", () => {
     console.log("Socket connected on client:", socket.id);
   socket.emit("join", myId);
   });
// ======================
// DOM
// ======================
const usersDiv = document.getElementById("users");
const messagesDiv = document.getElementById("messages");
const chatWithTitle = document.getElementById("chatWith");
const msgInput = document.getElementById("msg");

// ======================
// STATE
// ======================
let currentUserId = null;
let onlineUserIds = [];

// ======================
// HELPERS
// ======================
function scrollToBottom() {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ======================
// LOAD USERS
// ======================
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
    btn.style.background = "lightgray"; // offline default
    btn.style.border = "1px solid black";

    btn.onclick = () => openChat(u._id, u.name);

    usersDiv.appendChild(btn);
    usersDiv.appendChild(document.createElement("br"));
  });

  updateUserStatus();
}

// ======================
// OPEN CHAT
// ======================
async function openChat(userId, userName) {
  currentUserId = userId;
  messagesDiv.innerHTML = "";

  // reset borders
  document.querySelectorAll("#users button").forEach(btn => {
    btn.style.border = "1px solid black";
  });

  chatWithTitle.innerText = "Chat with: " + userName;

  const activeBtn = document.querySelector(
    `#users button[data-id="${userId}"]`
  );
  if (activeBtn) {
    activeBtn.style.border = "2px solid blue";
  }

  // persist last chat
  localStorage.setItem("lastChatUser", userId);
  localStorage.setItem("lastChatUserName", userName);

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

  scrollToBottom();
}

// ======================
// SEND MESSAGE
// ======================
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
  scrollToBottom();

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

// ======================
// RECEIVE MESSAGE
// ======================
socket.on("receiveMessage", data => {
  if (data.senderId !== currentUserId) return;

  const p = document.createElement("p");
  p.innerText = "Them: " + data.message;
  messagesDiv.appendChild(p);
  scrollToBottom();
});

// ======================
// ONLINE / OFFLINE
// ======================
socket.on("onlineUsers", users => {
  onlineUserIds = users;
  updateUserStatus();
  setTimeout(updateUserStatus, 100); // race-condition safe
});

function updateUserStatus() {
  document.querySelectorAll("#users button").forEach(btn => {
    const uid = btn.dataset.id;

    btn.style.background = onlineUserIds.includes(uid)
      ? "lightgreen"
      : "lightgray";

    if (uid === currentUserId) {
      btn.style.border = "2px solid blue";
    }
  });
}

// ======================
// INIT
// ======================
loadUsers();

const lastChatUser = localStorage.getItem("lastChatUser");
const lastChatUserName = localStorage.getItem("lastChatUserName");

if (lastChatUser && lastChatUserName) {
  setTimeout(() => {
    openChat(lastChatUser, lastChatUserName);
  }, 200);
}
