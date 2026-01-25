const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

let page = 1;
let loading = false;
let noMorePosts = false;

/* ======================
   URL HELPERS
====================== */
function getPostFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("post");
}

/* ======================
   TIME HELPER
====================== */
function timeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diff = Math.floor((now - past) / 1000);

  if (diff < 60) return "Just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return past.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
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
  document.getElementById("feed").innerHTML = "";
}

/* ======================
   SOCKET (REALTIME)
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
  return `<div style="margin-left:40px;font-size:12px;color:#666">Followed by ${p.followedBy[0]} and ${p.followedBy.length - 1} others</div>`;
}

/* ======================
   CREATE POST
====================== */
async function createPost() {
  const text = postText.value.trim();
  const img = postImage.files[0];
  const vid = postVideo.files[0];

  if (!text && !img && !vid) return alert("Write something");

  let image = null, video = null;

  if (img) {
    const fd = new FormData();
    fd.append("image", img);
    image = (await (await fetch(API + "/api/media/image", { method: "POST", body: fd })).json()).imageUrl;
  }

  if (vid) {
    const fd = new FormData();
    fd.append("video", vid);
    video = (await (await fetch(API + "/api/media/video", { method: "POST", body: fd })).json()).videoUrl;
  }

  await fetch(API + "/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ content: text, image, video })
  });

  postText.value = postImage.value = postVideo.value = "";
  resetFeed();
  loadFeed();
}

/* ======================
   COMMENT
====================== */
async function addComment(id) {
  const input = document.getElementById("c-" + id);
  if (!input.value.trim()) return;

  await fetch(API + "/api/posts/" + id + "/comment", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ text: input.value })
  });

  resetFeed();
  loadFeed();
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

  if (!posts.length) {
    loading = false;
    if (page === 1) setTimeout(loadFeed, 800);
    else noMorePosts = true;
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
      <div style="display:flex;gap:8px;cursor:pointer" onclick="goProfile('${p.userId._id}')">
        <img src="${p.userId.profilePic || 'https://via.placeholder.com/32'}" style="width:32px;height:32px;border-radius:50%">
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
   PROFILE MENU
====================== */
async function loadMyProfilePic() {
  const res = await fetch(API + "/api/users/profile/" + getMyId(), {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();
  if (data.user?.profilePic) profileMenuBtn.src = data.user.profilePic;
}

document.addEventListener("click", e => {
  if (profileMenuBtn.contains(e.target))
    profileDropdown.style.display = profileDropdown.style.display === "block" ? "none" : "block";
  else profileDropdown.style.display = "none";
});

function goMyProfile() { location.href = "profile.html"; }
function logout() { localStorage.clear(); location.href = "index.html"; }

/* ======================
   LIKE
====================== */
async function toggleLike(id) {
  await fetch(API + "/api/posts/" + id + "/like", {
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
  const res = await fetch(API + "/api/notifications/count", {
    headers: { Authorization: "Bearer " + token }
  });
  notifCount.innerText = (await res.json()).count || 0;
}

/* ======================
   INIT
====================== */
document.addEventListener("DOMContentLoaded", () => {
  loadMyProfilePic();
  loadNotificationCount();
  resetFeed();
  loadFeed();
});

/* ======================
   INFINITE SCROLL
====================== */
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200)
    loadFeed();
});
