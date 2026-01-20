const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

if (!token) location.href = "index.html";

async function loadNotifications() {
  const res = await fetch(API + "/api/notifications", {
    headers: { Authorization: "Bearer " + token }
  });

  const notifications = await res.json();
  const box = document.getElementById("notifications");
  box.innerHTML = "";

  if (!notifications.length) {
    box.innerHTML = "<p>No notifications</p>";
    return;
  }

  notifications.forEach(n => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "10px";
    div.style.marginBottom = "10px";

    let actions = "";

    if (n.type === "follow_request" && !n.seen) {
      actions = `
        <button onclick="acceptFollow('${n.fromUser._id}', '${n._id}')">Accept</button>
        <button onclick="rejectFollow('${n.fromUser._id}', '${n._id}')">Reject</button>
      `;
    } else {
      actions = `<a href="${n.link || '#'}">Open</a>`;
    }

    div.innerHTML = `
      <b>${n.fromUser?.name || "User"}</b>
      <p>${n.text}</p>
      ${actions}
    `;

    box.appendChild(div);
  });
}

async function acceptFollow(userId, notifId) {
  await fetch(API + "/api/users/follow-accept/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  await markSeen(notifId);
  loadNotifications();
}

async function rejectFollow(userId, notifId) {
  await fetch(API + "/api/users/follow-reject/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  await markSeen(notifId);
  loadNotifications();
}

async function markSeen(id) {
  await fetch(API + "/api/notifications/seen/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
}

loadNotifications();
