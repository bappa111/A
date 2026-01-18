const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  location.href = "index.html";
}

/* ======================
   LOAD NOTIFICATIONS
====================== */
async function loadNotifications() {
  const res = await fetch(API + "/api/notifications", {
    headers: { Authorization: "Bearer " + token }
  });

  const notifications = await res.json();
  const box = document.getElementById("notifications");
  box.innerHTML = "";

  if (!notifications || notifications.length === 0) {
    box.innerHTML = "<p>No notifications</p>";
    return;
  }

  notifications.forEach(n => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "10px";
    div.style.marginBottom = "10px";

    div.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center">
        <img
          src="${n.fromUser?.profilePic || "https://via.placeholder.com/32"}"
          style="width:32px;height:32px;border-radius:50%"
        />
        <b>${n.fromUser?.name || "User"}</b>
      </div>

      <p style="margin:6px 0">${n.text}</p>

      ${
        n.type === "follow_request"
          ? `
            <button onclick="acceptFollow('${n.fromUser._id}', '${n._id}')">
              ✅ Accept
            </button>
            <button onclick="rejectFollow('${n.fromUser._id}', '${n._id}')">
              ❌ Reject
            </button>
          `
          : `
            <a href="${n.link || "#"}" onclick="markSeen('${n._id}')">
              Open
            </a>
          `
      }
    `;

    box.appendChild(div);
  });
}

/* ======================
   ACCEPT FOLLOW REQUEST
====================== */
async function acceptFollow(userId, notificationId) {
  await fetch(API + "/api/users/follow-accept/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  await markSeen(notificationId);
  loadNotifications();
}

/* ======================
   REJECT FOLLOW REQUEST
====================== */
async function rejectFollow(userId, notificationId) {
  await fetch(API + "/api/users/follow-reject/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  await markSeen(notificationId);
  loadNotifications();
}

/* ======================
   MARK NOTIFICATION SEEN
====================== */
async function markSeen(id) {
  await fetch(API + "/api/notifications/seen/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
}

/* ======================
   INIT
====================== */
loadNotifications();
