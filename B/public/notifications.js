const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

if (!token) location.href = "index.html";

/* ======================
   BADGE = SOURCE OF TRUTH
====================== */
async function refreshBadge() {
  try {
    const res = await fetch(API + "/api/notifications/count", {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();

    // same tab badge
    const badge = document.getElementById("notifCount");
    if (badge) badge.innerText = data.count || 0;

    // opener tab badge (feed page)
    if (window.opener && window.opener.document) {
      const openerBadge =
        window.opener.document.getElementById("notifCount");
      if (openerBadge) openerBadge.innerText = data.count || 0;
    }
  } catch (e) {
    console.error("Badge refresh failed", e);
  }
}

/* ======================
   LOAD NOTIFICATIONS
====================== */
async function loadNotifications() {
  const res = await fetch(API + "/api/notifications", {
    headers: { Authorization: "Bearer " + token }
  });

  const list = await res.json();
  const box = document.getElementById("notifications");
  box.innerHTML = "";

  if (!list.length) {
    box.innerHTML = "<p>No notifications</p>";
    return;
  }

  list.forEach(n => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "10px";
    div.style.marginBottom = "10px";

    let actions = "";

    // 🔔 FOLLOW REQUEST
    if (n.type === "follow_request" && !n.seen) {
      actions = `
        <button onclick="acceptFollow('${n.fromUser._id}', '${n._id}')">Accept</button>
        <button onclick="rejectFollow('${n.fromUser._id}', '${n._id}')">Reject</button>
      `;
    } 
    // 🔗 NORMAL NOTIFICATION
    else {
      actions = `
        <a href="${n.link || '#'}" onclick="singleSeen('${n._id}')">
          Open
        </a>
      `;
    }

    div.innerHTML = `
      <b>${n.fromUser?.name || "System"}</b>
      <p>${n.text}</p>
      <div style="font-size:12px;color:#888">
        ${timeAgo(n.createdAt)}
      </div>
      ${actions}
    `;

    box.appendChild(div);
  });
}

/* ======================
   SINGLE READ
====================== */
async function singleSeen(id) {
  await fetch(API + "/api/notifications/seen/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  refreshBadge();
}

/* ======================
   MARK ALL READ
====================== */
async function markAllSeenBtn() {
  const res = await fetch(API + "/api/notifications", {
    headers: { Authorization: "Bearer " + token }
  });

  const list = await res.json();

  for (let n of list) {
    if (!n.seen) {
      await fetch(API + "/api/notifications/seen/" + n._id, {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      });
    }
  }

  refreshBadge();
  loadNotifications();
}

/* ======================
   FOLLOW REQUEST ACTIONS
====================== */
async function acceptFollow(userId, notifId) {
  await fetch(API + "/api/users/follow-accept/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  await singleSeen(notifId);
  loadNotifications();
}

async function rejectFollow(userId, notifId) {
  await fetch(API + "/api/users/follow-reject/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  await singleSeen(notifId);
  loadNotifications();
}

/* ======================
   INIT
====================== */
loadNotifications();
refreshBadge();
