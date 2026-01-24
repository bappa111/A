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
   AUTH HELPERS
====================== */
function getMyId() {
  const t = localStorage.getItem("token");
  if (!t) return null;
  try {
    return JSON.parse(atob(t.split(".")[1])).id;
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
   SOCKET (REALTIME)
====================== */
const socket = io(API, {
  query: { userId: getMyId() }
});

socket.on("notification", () => {
  loadNotificationCount();
});

/* ======================
   FOLLOWED BY BADGE
====================== */
function renderFollowedBy(p) {
  if (!p.followedBy || !p.followedBy.length) return "";

  if (p.followedBy.length === 1) {
    return `<div style="margin-left:40px;font-size:12px;color:#666">
      Followed by ${p.followedBy[0]}
    </div>`;
  }

  if (p.followedBy.length === 2) {
    return `<div style="margin-left:40px;font-size:12px;color:#666">
      Followed by ${p.followedBy[0]}, ${p.followedBy[1]}
    </div>`;
  }

  return `<div style="margin-left:40px;font-size:12px;color:#666">
    Followed by ${p.followedBy[0]} and ${p.followedBy.length - 1} others
  </div>`;
}

/* ======================
   CREATE POST
====================== */
async function createPost() {
  const text = document.getElementById("postText").value.trim();
  const imageFile = document.getElementById("postImage").files[0];
  const videoFile = document.getElementById("postVideo").files[0];

  if (!text && !imageFile && !videoFile) {
    return alert("Write something or select image/video");
  }

  let imageUrl = null;
  let videoUrl = null;

  if (imageFile) {
    const fd = new FormData();
    fd.append("image", imageFile);
    const res = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    imageUrl = data.imageUrl || null;
  }

  if (videoFile) {
    const fd = new FormData();
    fd.append("video", videoFile);
    const res = await fetch(API + "/api/media/video", {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    videoUrl = data.videoUrl || null;
  }

  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      content: text || "",
      image: imageUrl,
      video: videoUrl
    })
  });

  document.getElementById("postText").value = "";
  document.getElementById("postImage").value = "";
  document.getElementById("postVideo").value = "";

  resetFeed();
  loadFeed();
}

/* ======================
   ADD COMMENT
====================== */
async function addComment(postId) {
  const input = document.getElementById("c-" + postId);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  await fetch(API + "/api/posts/" + postId + "/comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ text })
  });

  input.value = "";
  resetFeed();
  loadFeed();
}

/* ======================
   LOAD FEED (PAGINATED)
====================== */
async function loadFeed() {
  if (loading || noMorePosts) return;
  loading = true;

  const res = await fetch(API + "/api/posts?page=" + page, {
    headers: { Authorization: "Bearer " + token }
  });

  const posts = await res.json();
  if (!posts.length) {
    noMorePosts = true;
    loading = false;
    return;
  }

  const feed = document.getElementById("feed");
  const targetPostId = getPostFromURL();

  posts.forEach(p => {
    if (!p.userId) return;

    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "12px";

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer"
           onclick="goProfile('${p.userId._id}')">
        <img src="${p.userId.profilePic || 'https://via.placeholder.com/32'}"
             style="width:32px;height:32px;border-radius:50%" />
        <b>${p.userId.name}</b>
      </div>

      ${renderFollowedBy(p)}

      <p>${p.content || ""}</p>
      <div style="font-size:12px;color:#888;margin-top:4px">
        ${timeAgo(p.createdAt)}
      </div>

      ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
      ${p.video ? `<video controls style="max-width:100%"><source src="${p.video}"></video>` : ""}

      <div>
        <button onclick="toggleLike('${p._id}')">
          👍 Like (${p.likes?.length || 0})
        </button>
      </div>

      <div style="margin-top:6px">
        ${(p.comments || []).map(c => `
          <div style="margin-left:10px;font-size:14px">
            💬 ${c.text}
            <div style="font-size:11px;color:#888">
              ${timeAgo(c.createdAt)}
            </div>
          </div>
        `).join("")}
      </div>

      <div style="margin-top:6px">
        <input id="c-${p._id}" placeholder="Write comment..." style="width:70%" />
        <button onclick="addComment('${p._id}')">Send</button>
      </div>
    `;

    if (targetPostId && p._id === targetPostId) {
      div.style.border = "2px solid red";
      div.style.background = "#fff6f6";
      setTimeout(() => {
        div.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
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
  const myId = getMyId();
  if (!myId) return;

  const res = await fetch(API + "/api/users/profile/" + myId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  if (data.user?.profilePic) {
    document.getElementById("profileMenuBtn").src = data.user.profilePic;
  }
}

document.addEventListener("click", e => {
  const btn = document.getElementById("profileMenuBtn");
  const drop = document.getElementById("profileDropdown");
  if (!btn || !drop) return;

  if (btn.contains(e.target)) {
    drop.style.display = drop.style.display === "block" ? "none" : "block";
  } else if (!drop.contains(e.target)) {
    drop.style.display = "none";
  }
});

function goMyProfile() {
  location.href = "profile.html";
}

function logout() {
  localStorage.removeItem("token");
  location.href = "index.html";
}

/* ======================
   LIKE
====================== */
async function toggleLike(postId) {
  await fetch(API + "/api/posts/" + postId + "/like", {
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
  const data = await res.json();
  const badge = document.getElementById("notifCount");
  if (badge) badge.innerText = data.count || 0;
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
  const nearBottom =
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (nearBottom) loadFeed();
});
