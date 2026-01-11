const socket = io();
let currentUserId = null;
const token = localStorage.getItem("token");

// Load users
async function loadUsers() {
  const res = await fetch("/api/users", {
    headers: {
      "Authorization": "Bearer " + token
    }
  });
  const users = await res.json();
  usersDiv.innerHTML = users.map(u =>
    `<button onclick="openChat('${u._id}')">${u.name}</button><br>`
  ).join("");
}

async function openChat(userId) {
  currentUserId = userId;
  const res = await fetch(`/api/chat/${userId}`, {
    headers: {
      "Authorization": "Bearer " + token
    }
  });
  const chats = await res.json();
  messages.innerHTML = chats.map(c =>
    `<p><b>${c.senderId === userId ? "Them" : "Me"}:</b> ${c.message}</p>`
  ).join("");
}

async function sendMessage() {
  if (!currentUserId) return alert("Select a user");

  const text = msg.value;

  await fetch("/api/chat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: currentUserId,
      message: text
    })
  });

  socket.emit("sendMessage", { message: text });
  msg.value = "";
  openChat(currentUserId);
}

socket.on("receiveMessage", data => {
  messages.innerHTML += `<p><b>Them:</b> ${data.message}</p>`;
});

loadUsers();
