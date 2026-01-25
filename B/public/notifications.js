const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

if (!token) location.href = "index.html";

/* ======================
   TIME HELPER
====================== */
function timeAgo(dateString) {
  const diff = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (diff < 60) return "Just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/* ======================
   LOAD NOTIFICATIONS (FINAL)
====================== */
async function loadNotifications() {
  const res = await fetch(API + "/api/notifications", {
    headers: { Authorization: "Bearer " + token }
  });

  const list = await res.json();
  const box = document.getElementById("notifications");
  box.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    box.innerHTML = "<p>No notifications</p>";
    return;
  }

  list.forEach(n => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.alignItems = "center";
    div.style.border = "1px solid #ccc";
    div.style.padding = "10px";
    div.style.marginBottom = "10px";

    const avatar =
      n.fromUser?.profilePic || "https://via.placeholder.com/40";

    const name = n.fromUser?.name || "System";

    div.innerHTML = `
      <img src="${avatar}"
           width="40" height="40"
           style="border-radius:50%;object-fit:cover">

      <div style="flex:1">
        <b>${name}</b>
        <p style="margin:4px 0">${n.text}</p>
        <div style="font-size:12px;color:#888">
          ${timeAgo(n.createdAt)}
        </div>
      </div>

      ${
        n.link
          ? `<a href="${n.link}" onclick="singleSeen('${n._id}')">Open</a>`
          : ""
      }
    `;

    box.appendChild(div);
  });
}

/* ======================
   SINGLE SEEN
====================== */
async function singleSeen(id) {
  await fetch(API + "/api/notifications/seen/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
}

/* ======================
   MARK ALL READ
====================== */
async function markAllSeenBtn() {
  await fetch(API + "/api/notifications/seen-all", {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  refreshBadge();
  loadNotifications();
}

/* ======================
   INIT
====================== */

