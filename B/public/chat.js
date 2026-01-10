const socket = io();
const API = "";

const token = localStorage.getItem("token");

// Load old messages
async function loadChat() {
  const userId = receiverId.value;
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

// Send message
async function sendMessage() {
  const text = msg.value;
  const userId = receiverId.value;

  socket.emit("sendMessage", {
    message: text
  });

  await fetch("/api/chat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      receiverId: userId,
      message: text
    })
  });

  msg.value = "";
  loadChat();
}

// Receive real-time message
socket.on("receiveMessage", data => {
  messages.innerHTML += `<p><b>Them:</b> ${data.message}</p>`;
});
