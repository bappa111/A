const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

let page = 1;
let loading = false;
let noMorePosts = false;

/* ======================
   URL HELPERS
====================== */
function getPostFromURL() {
  return new URLSearchParams(window.location.search).get("post");
}

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
  if (days < 7) return `${days} days ago`;
  return new Date(dateString).toLocaleDateString("en-IN");
}

/* ======================
   AUTH
====================== */
function getMyId() {
  try {
    return JSON.parse(atob(token.split(".")[1])).id;
  } catch {
    return null;
  }
}

/* ======================
   RESET FEED
====================== */
function resetFeed() {
  page = 1;
  loading = false;
  noMorePosts = false;
  const feed = document.getElementById("feed");
  if (feed) feed.innerHTML = "";
}

/* ======================
   SOCKET
====================== */
const socket = io(API, { query: { userId: getMyId() } });

socket.on("notification", () => {
  loadNotificationCount();
  if (typeof loadNotifications === "function") loadNotifications();
});

/* ======================
   FOLLOWED BY
====================== */
function renderFollowedBy(p) {
  if (!p.followedBy?.length) return "";
  if (p.followedBy.length === 1)
    return `<div style="margin-left:40px;font-size:12px;color:#666">Followed by ${p.followedBy[0]}</div>`;
  if (p.followedBy.length === 2)
    return `<div style="margin-left:40px;font-size:12px;color:#666">Followed by ${p.followedBy[0]}, ${p.followedBy[1]}</div>`;
  return `<div style="margin-left:40px;font-size:12px;color:#666">
    Followed by ${p.followedBy[0]} and ${p.followedBy.length - 1} others
  </div>`;
}

/* ======================
   LOAD FEED
====================== */
async function loadFeed() {
  if (loading || noMorePosts) return;
  loading = true;

  const res = await fetch(`${API}/api/posts?page=${page}`, {
    headers: { Authorization: "Bearer " + token }
  });

  const posts = await res.json();

  if (!Array.isArray(posts) || posts.length === 0) {
    noMorePosts = true;
    loading = false;
    return;
  }

  const feed = document.getElementById("feed");
  const target = getPostFromURL();

  posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "12px";

    div.innerHTML = `
      <div style="display:flex;gap:8px;cursor:pointer"
           onclick="goProfile('${p.userId._id}')">
        <img src="${p.userId.profilePic || 'https://via.placeholder.com/32'}"
             style="width:32px;height:32px;border-radius:50%">
        <b>${p.userId.name}</b>
      </div>
      ${renderFollowedBy(p)}
      <p>${p.content || ""}</p>
      <div style="font-size:12px;color:#888">${timeAgo(p.createdAt)}</div>
      ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
      ${p.video ? `<video controls style="max-width:100%"><source src="${p.video}"></video>` : ""}
      <button onclick="toggleLike('${p._id}')">👍 Like (${p.likes.length})</button>

      ${(p.comments || []).map(c => `
        <div style="margin-left:10px">
          💬 ${c.text}
          <div style="font-size:11px;color:#888">${timeAgo(c.createdAt)}</div>
        </div>
      `).join("")}

      <input id="c-${p._id}" placeholder="Write comment..." style="width:70%">
      <button onclick="addComment('${p._id}')">Send</button>
    `;

    if (target === p._id) {
      div.style.border = "2px solid red";
      setTimeout(() => div.scrollIntoView({ behavior: "smooth" }), 300);
      history.replaceState({}, "", "/feed.html");
    }

    feed.appendChild(div);
  });

  page++;
  loading = false;
}

/* ======================
   COMMENT
====================== */
async function addComment(id) {
  const input = document.getElementById("c-" + id);
  if (!input?.value.trim()) return;

  await fetch(`${API}/api/posts/${id}/comment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ text: input.value })
  });

  resetFeed();
  loadFeed();
}

/* ======================
   PROFILE MENU (SAFE)
====================== */
document.addEventListener("click", e => {
  const btn = document.getElementById("profileMenuBtn");
  const drop = document.getElementById("profileDropdown");
  if (!btn || !drop) return;

  if (btn.contains(e.target))
    drop.style.display = drop.style.display === "block" ? "none" : "block";
  else drop.style.display = "none";
});

function goMyProfile() { location.href = "profile.html"; }
function logout() { localStorage.clear(); location.href = "index.html"; }

/* ======================
   LIKE
====================== */
async function toggleLike(id) {
  await fetch(`${API}/api/posts/${id}/like`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  resetFeed();
  loadFeed();
}

/* ======================
   NOTIFICATION BADGE
====================== */
async function loadNotificationCount() {
  const res = await fetch(`${API}/api/notifications/count`, {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();
  const badge = document.getElementById("notifCount");
  if (badge) badge.innerText = data.count || 0;
}

/* ======================
   INIT
====================== */
document.addEventListener("DOMContentLoaded", () => {
  resetFeed();
  loadFeed();
  loadNotificationCount();
});

/* ======================
   INFINITE SCROLL
====================== */
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200)
    loadFeed();
});
