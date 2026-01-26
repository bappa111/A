const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

if (!token) {
  alert("No token found. Please login again.");
  location.href = "index.html";
}

/* ======================
   STATE
====================== */
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

/*share link*/
function sharePost(postId) {
  const url = `${location.origin}/feed.html?post=${postId}`;

  // Mobile (Android / iOS)
  if (navigator.share) {
    navigator.share({
      title: "Check this post",
      url
    }).catch(() => {});
  } 
  // Desktop fallback
  else {
    navigator.clipboard.writeText(url);
    alert("Post link copied!");
  }
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
   CREATE POST
====================== */
async function createPost() {
  try {
    const postText = document.getElementById("postText");
    const postImage = document.getElementById("postImage");
    const postVideo = document.getElementById("postVideo");

    const text = postText.value.trim();
    const img = postImage.files[0];
    const vid = postVideo.files[0];

    if (!text && !img && !vid) {
      alert("Write something or select image/video");
      return;
    }

    let image = null;
    let video = null;

    if (img) {
      const res = await uploadWithProgress({
        url: API + "/api/media/image",
        file: img,
        field: "image"
      });
      image = res.imageUrl;
    }

    if (vid) {
      const res = await uploadWithProgress({
        url: API + "/api/media/video",
        file: vid,
        field: "video"
      });
      video = res.videoUrl;
    }

    await fetch(API + "/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ content: text, image, video })
    });

    postText.value = "";
    postImage.value = "";
    postVideo.value = "";

    resetFeed();
    loadFeed();

  } catch (e) {
    alert("Post failed");
    console.error(e);
  }
}

/* ======================
   LOAD FEED
====================== */
async function loadFeed() {
  if (loading || noMorePosts) return;
  loading = true;

  let posts = [];
  try {
    const res = await fetch(`${API}/api/posts?page=${page}`, {
      headers: { Authorization: "Bearer " + token }
    });
    posts = await res.json();
  } catch {
    loading = false;
    return;
  }

  if (!Array.isArray(posts) || posts.length === 0) {
    if (page > 1) noMorePosts = true;
    loading = false;
    return;
  }

  const feed = document.getElementById("feed");

  posts.forEach(p => {
    if (!p.userId) return;

    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.width = "100%";
    div.style.boxSizing = "border-box";
    div.style.padding = "8px";
    div.style.marginBottom = "12px";

    div.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;gap:8px;align-items:center;cursor:pointer"
       onclick="goProfile('${p.userId._id}')">
    <img src="${p.userId.profilePic || 'https://via.placeholder.com/40'}"
         style="width:32px;height:32px;border-radius:50%;object-fit:cover">
    <b>${p.userId.name}</b>
  </div>

  ${
    p.userId._id === getMyId()
      ? `
      <div style="position:relative">
        <button onclick="togglePostMenu('${p._id}')"
          style="background:none;border:none;font-size:18px;cursor:pointer">⋮</button>
        <div id="menu-${p._id}"
             style="display:none;position:absolute;right:0;
                    background:#fff;border:1px solid #ccc;
                    box-shadow:0 2px 6px rgba(0,0,0,.2);z-index:10">
          <div onclick="editPost('${p._id}')" style="padding:6px">✏️ Edit</div>
          <div onclick="deletePost('${p._id}')" style="padding:6px;color:red">🗑 Delete</div>
          <div onclick="pinPost('${p._id}')" style="padding:6px">📌 Pin</div>
        </div>
      </div>`
      : ""
  }
</div>

${p.followedBy?.length ? `
<div style="margin-left:40px;font-size:12px;color:#666">
  Followed by ${p.followedBy.filter(Boolean).join(", ")}
</div>` : ""}

<p>${p.content || ""}</p>
<div style="font-size:12px;color:#888">${timeAgo(p.createdAt)}</div>

${p.image ? `
  <div style="width:100%;margin-top:6px">
    <img src="${p.image}"
         style="width:100%;height:auto;display:block;border-radius:6px">
  </div>
` : ""}
${p.video ? `
  <div style="width:100%;margin-top:6px">
    <video controls
           style="width:100%;height:auto;display:block;border-radius:6px">
      <source src="${p.video}">
    </video>
  </div>
` : ""}

<button onclick="toggleLike('${p._id}')">👍 Like (${p.likes?.length || 0})</button>

<button onclick="sharePost('${p._id}')">
  🔗 Share
</button>

${(p.comments || []).map(c => `
  <div style="margin-left:10px">
    💬 ${c.text}
    <div style="font-size:11px;color:#888">${timeAgo(c.createdAt)}</div>
  </div>`).join("")}

<input id="c-${p._id}" placeholder="Write comment..." style="width:70%">
<button onclick="addComment('${p._id}')">Send</button>
`;

    feed.appendChild(div);
  });

  page++;
  loading = false;
}

/* ======================
   POST MENU
====================== */
function togglePostMenu(id) {
  document.querySelectorAll("[id^='menu-']").forEach(m => m.style.display = "none");
  const menu = document.getElementById("menu-" + id);
  if (menu) menu.style.display = "block";
}

/* ======================
   COMMENT / LIKE
====================== */
async function addComment(id) {
  const input = document.getElementById("c-" + id);
  if (!input.value.trim()) return;

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

async function toggleLike(id) {
  await fetch(`${API}/api/posts/${id}/like`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  resetFeed();
  loadFeed();
}

/* ======================
   EDIT / DELETE / PIN
====================== */
async function editPost(id) {
  const text = prompt("Edit your post:");
  if (!text || !text.trim()) return;

  await fetch(`${API}/api/posts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ content: text })
  });

  resetFeed();
  loadFeed();
}

async function deletePost(id) {
  if (!confirm("Delete this post?")) return;

  await fetch(`${API}/api/posts/${id}`, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  resetFeed();
  loadFeed();
}

function pinPost() {
  alert("Pin feature coming soon 😉");
}

/* ======================
   PROFILE + NOTIF
====================== */
function goProfile(id) {
  location.href = "profile.html?id=" + id;
}

async function loadNotificationCount() {
  const r = await fetch(`${API}/api/notifications/count`, {
    headers: { Authorization: "Bearer " + token }
  });
  const d = await r.json();
  const b = document.getElementById("notifCount");
  if (b) b.innerText = d.count || 0;
}

async function loadMyProfilePic() {
  const r = await fetch(API + "/api/users/profile/" + getMyId(), {
    headers: { Authorization: "Bearer " + token }
  });
  const d = await r.json();
  const img = document.getElementById("profileMenuBtn");
  if (img) img.src = d.user?.profilePic || "https://via.placeholder.com/40";
}

/* ======================
   INIT
====================== */
document.addEventListener("DOMContentLoaded", () => {
  loadMyProfilePic();
  resetFeed();
  loadFeed();
  loadNotificationCount();
});

/*search user*/
const searchInput = document.getElementById("userSearch");
const resultBox = document.getElementById("searchResults");

if (searchInput) {
  searchInput.addEventListener("input", async () => {
    const q = searchInput.value.trim();
    if (!q) {
      resultBox.style.display = "none";
      resultBox.innerHTML = "";
      return;
    }

    const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: "Bearer " + token }
    });

    const users = await res.json();
    resultBox.innerHTML = "";

    if (!users.length) {
      resultBox.style.display = "block";
      resultBox.innerHTML = `<div style="padding:8px;color:#666">No users found</div>`;
      return;
    }

    users.forEach(u => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "8px";
      div.style.padding = "8px";
      div.style.cursor = "pointer";

      div.innerHTML = `
        <img src="${u.profilePic || 'https://via.placeholder.com/40'}"
             style="width:32px;height:32px;border-radius:50%">
        <b>${u.name}</b>
      `;

      div.onclick = () => {
        location.href = "profile.html?id=" + u._id;
      };

      resultBox.appendChild(div);
    });

    resultBox.style.display = "block";
  });
}

/* close on outside click */
document.addEventListener("click", e => {
  if (!e.target.closest("#userSearch")) {
    if (resultBox) resultBox.style.display = "none";
  }
});

/* ======================
   SCROLL + MENU CLOSE
====================== */
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200)
    loadFeed();
});

document.addEventListener("click", e => {
  if (!e.target.closest("button"))
    document.querySelectorAll("[id^='menu-']").forEach(m => m.style.display = "none");
});


function uploadWithProgress({ url, file, field }) {
  return new Promise((resolve, reject) => {
    const overlay = document.getElementById("uploadOverlay");
    const percentText = document.getElementById("uploadPercent");

    overlay.style.display = "flex";
    percentText.innerText = "0%";

    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append(field, file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        percentText.innerText = percent + "%";
      }
    };

    xhr.onload = () => {
      overlay.style.display = "none";
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        alert("Upload failed");
        reject();
      }
    };

    xhr.onerror = () => {
      overlay.style.display = "none";
      alert("Upload error");
      reject();
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
    xhr.send(fd);
  });
}
