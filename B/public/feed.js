const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   HELPERS
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
   SOCKET CONNECT (REALTIME)
====================== */
const socket = io("https://a-kisk.onrender.com", {
  query: { userId: getMyId() }
});

socket.on("notification", (notif) => {
  console.log("🔔 Realtime notification:", notif);
  loadNotificationCount();

  // optional toast
  // alert(notif.text);
});

/* ======================
   FOLLOWED BY BADGE
====================== */
function renderFollowedBy(p) {
  if (!p.followedBy || p.followedBy.length === 0) return "";

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
    const res = await fetch(API + "/api/media/image", { method: "POST", body: fd });
    const data = await res.json();
    imageUrl = data.imageUrl || null;
  }

  if (videoFile) {
    const fd = new FormData();
    fd.append("video", videoFile);
    const res = await fetch(API + "/api/media/video", { method: "POST", body: fd });
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

  loadFeed();
}

/* ======================
   LOAD FEED
====================== */
async function loadFeed() {
  const res = await fetch(API + "/api/posts", {
    headers: { Authorization: "Bearer " + token }
  });

  const posts = await res.json();
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  const myId = getMyId();

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
             style="width:32px;height:32px;border-radius:50%;object-fit:cover"/>
        <b>${p.userId.name || "User"}</b>
      </div>

      ${renderFollowedBy(p)}

      <p>${p.content || ""}</p>

      ${p.image ? `<img src="${p.image}" style="max-width:100%;margin-top:6px"/>` : ""}
      ${p.video ? `
        <video controls style="max-width:100%;margin-top:6px">
          <source src="${p.video}" type="video/mp4">
        </video>` : ""}

      <div style="margin-top:6px;display:flex;gap:10px">
        <button onclick="toggleLike('${p._id}')">
          👍 Like (${p.likes?.length || 0})
        </button>
        ${p.userId._id === myId
          ? `<button onclick="deletePost('${p._id}')" style="color:red">🗑️ Delete</button>`
          : ""}
      </div>

      <div style="margin-top:6px">
        ${(p.comments || []).map(c => `
          <div style="margin-left:10px;font-size:14px">💬 ${c.text}</div>
        `).join("")}
      </div>

      <div style="margin-top:6px">
        <input placeholder="Write comment..." id="c-${p._id}" style="width:70%"/>
        <button onclick="addComment('${p._id}')">Send</button>
      </div>
    `;

    feed.appendChild(div);
  });
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

function goMyProfile() {
  location.href = "profile.html";
}

function logout() {
  localStorage.removeItem("token");
  location.href = "index.html";
}

/* ======================
   LIKE / COMMENT / DELETE
====================== */
async function toggleLike(postId) {
  await fetch(API + "/api/posts/" + postId + "/like", {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadFeed();
}

async function addComment(postId) {
  const input = document.getElementById("c-" + postId);
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
  loadFeed();
}

async function deletePost(postId) {
  await fetch(API + "/api/posts/" + postId, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });
  loadFeed();
}

function goProfile(userId) {
  if (!userId) return;
  location.href = "profile.html?id=" + userId;
}

/* ======================
   NOTIFICATION BADGE
====================== */
async function loadNotificationCount() {
  const t = localStorage.getItem("token");
  if (!t) return;

  const res = await fetch(API + "/api/notifications/count", {
    headers: { Authorization: "Bearer " + t }
  });

  const data = await res.json();
  const badge = document.getElementById("notifCount");
  if (badge) badge.innerText = data.count || 0;
}

/* ======================
   INIT
====================== */
loadMyProfilePic();
loadFeed();
loadNotificationCount();
