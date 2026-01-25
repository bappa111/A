const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   AUTH HELPERS
====================== */
function getMyId() {
  try {
    return JSON.parse(atob(token.split(".")[1])).id;
  } catch {
    return null;
  }
}

const params = new URLSearchParams(window.location.search);
const myId = getMyId();
const profileUserId = params.get("id") || myId;

/* ======================
   CHECK PERSONAL ACCESS STATUS
====================== */
async function checkPersonalAccessStatus() {
  const btn = document.getElementById("requestAccessBtn");
  if (!btn) return;

  const res = await fetch(
    API + "/api/personal-access/status/" + profileUserId,
    { headers: { Authorization: "Bearer " + token } }
  );
  const data = await res.json();

  if (data.status === "pending") {
    btn.innerText = "⏳ Request Pending";
    btn.disabled = true;
  }

  if (data.status === "approved") {
    btn.style.display = "none";
  }

  if (data.status === "rejected") {
    btn.innerText = "Request Again";
    btn.disabled = false;
  }
}

/* ======================
   PROFILE HEADER
====================== */
async function loadMyProfileHeader() {
  if (!token) return;

  const res = await fetch(API + "/api/users/profile/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();

  const title = document.getElementById("profileTitle");
  if (title && data.user?.name) title.innerText = data.user.name;
}

/* ======================
   LOAD PROFILE (MASTER)
====================== */
async function loadProfile() {
  const res = await fetch(API + "/api/users/profile/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  if (!data.user) return alert("User not found");

  const isOwner = profileUserId === myId;
  const isFollower = data.user.followers.some(id => id.toString() === myId);
  const isPrivate = data.user.isPrivate === true;

  const img = document.getElementById("profilePic");
  const bio = document.getElementById("bio");
  const postsSection = document.getElementById("postsSection");
  const posts = document.getElementById("posts");
  const chatBtn = document.getElementById("chatBtn");
  const followBtn = document.getElementById("followBtn");
  const saveBtn = document.getElementById("saveBtn");
  const picInput = document.getElementById("profilePicInput");
  const followersCount = document.getElementById("followersCount");
  const followingCount = document.getElementById("followingCount");
  const personalBox = document.getElementById("personalPostBox");
  const requestBtn = document.getElementById("requestAccessBtn");

  /* RESET UI */
  saveBtn.style.display = "none";
  picInput.style.display = "none";
  chatBtn.style.display = "none";
  followBtn.style.display = "none";
  personalBox.style.display = "none";
  requestBtn.style.display = "none";
  postsSection.style.display = "block";

  /* BASIC INFO */
  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  bio.value = data.user.bio || "";
  bio.disabled = !isOwner;
  followersCount.innerText = data.user.followersCount || 0;
  followingCount.innerText = data.user.followingCount || 0;

  /* PRIVATE PROFILE LOCK */
  if (isPrivate && !isOwner && !isFollower) {
    postsSection.style.display = "none";
    followBtn.style.display = "inline-block";
    followBtn.innerText = "Follow";

    requestBtn.style.display = "inline-block";
    requestBtn.onclick = requestPersonalAccess;

    await checkPersonalAccessStatus();
    await loadPersonalPosts({ isOwner });
    return;
  }

  /* OWNER UI */
  if (isOwner) {
    saveBtn.style.display = "inline-block";
    picInput.style.display = "inline-block";
    personalBox.style.display = "block";
  }

  /* VISITOR UI */
  if (!isOwner) {
    followBtn.style.display = "inline-block";
    followBtn.innerText = isFollower ? "Unfollow" : "Follow";
    if (!isPrivate || isFollower) chatBtn.style.display = "inline-block";
  }

  /* PUBLIC POSTS */
  posts.innerHTML = "";
  data.posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "10px";
    div.innerHTML = `
      <p>${p.content || ""}</p>
      ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
      ${p.video ? `<video controls style="max-width:100%"><source src="${p.video}"></video>` : ""}
    `;
    posts.appendChild(div);
  });

  await loadPersonalPosts({ isOwner });
}

/* ======================
   PERSONAL POSTS (FINAL LOGIC)
====================== */
async function loadPersonalPosts({ isOwner }) {
  const container = document.getElementById("personalPosts");
  if (!container) return;

  let hasPersonalAccess = false;

  if (!isOwner) {
    const res = await fetch(
      API + "/api/personal-access/status/" + profileUserId,
      { headers: { Authorization: "Bearer " + token } }
    );
    const data = await res.json();
    hasPersonalAccess = data.status === "approved";
  }

  if (!isOwner && !hasPersonalAccess) {
    container.innerHTML = `
      <p style="color:#888">🔒 Personal posts are private</p>
      <button onclick="requestPersonalAccess()">Request Access</button>
    `;
    return;
  }

  const res = await fetch(API + "/api/personal-posts/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });

  const list = await res.json();
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML = "<p style='color:#888'>No personal posts</p>";
    return;
  }

  // ✅ একমাত্র সঠিক জায়গা
  list.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px dashed #aaa";
    div.style.padding = "8px";
    div.style.marginBottom = "8px";

    div.innerHTML = `
      <p>${p.content || ""}</p>

      ${p.image ? `
        <img src="${p.image}" style="max-width:100%;margin-top:6px">
      ` : ""}

      ${p.video ? `
        <video controls style="max-width:100%;margin-top:6px">
          <source src="${p.video}">
        </video>
      ` : ""}

      <div style="font-size:12px;color:#666">
        ${new Date(p.createdAt).toLocaleString()}
      </div>
    `;

    container.appendChild(div);
  });
}

/* ======================
   PERSONAL ACCESS (OWNER)
====================== */
async function loadPersonalAccessRequests() {
  if (profileUserId !== myId) return;

  const box = document.getElementById("personalAccessRequests");
  const list = document.getElementById("accessRequestList");
  if (!box || !list) return;

  box.style.display = "block";
  list.innerHTML = "Loading...";

  const res = await fetch(API + "/api/personal-access/requests", {
    headers: { Authorization: "Bearer " + token }
  });
  const requests = await res.json();

  list.innerHTML = "";
  if (!requests.length) {
    list.innerHTML = "<p>No pending requests</p>";
    return;
  }

  requests.forEach(r => {
    const div = document.createElement("div");
    div.innerHTML = `
      <b>${r.requester.name}</b><br>
      <button onclick="approveAccess('${r._id}')">Approve</button>
      <button onclick="rejectAccess('${r._id}')">Reject</button>
    `;
    list.appendChild(div);
  });
}

async function approveAccess(id) {
  await fetch(API + "/api/personal-access/approve/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadPersonalAccessRequests();
  loadProfile();
}

async function rejectAccess(id) {
  await fetch(API + "/api/personal-access/reject/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadPersonalAccessRequests();
}

/* ======================
   CREATE PERSONAL POST
====================== */
async function createPersonalPost() {
  const text = document.getElementById("personalPostText").value.trim();
  const file = document.getElementById("personalPostMedia").files[0];

  if (!text && !file) {
    alert("Write something or select image/video");
    return;
  }

  let image = null;
  let video = null;

  // 🔼 upload media if exists
  if (file) {
    const fd = new FormData();
    fd.append("image", file);

    const upload = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });

    const data = await upload.json();

    if (file.type.startsWith("video")) {
      video = data.imageUrl;
    } else {
      image = data.imageUrl;
    }
  }

  // 🔐 create personal post
  await fetch(API + "/api/personal-posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      content: text,
      image,
      video
    })
  });

  // reset
  document.getElementById("personalPostText").value = "";
  document.getElementById("personalPostMedia").value = "";

  loadProfile();
}

/* ======================
   FOLLOW / UPDATE / CHAT
====================== */
async function toggleFollow() {
  await fetch(API + "/api/users/follow/" + profileUserId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadProfile();
}

async function updateProfile() {
  if (profileUserId !== myId) return;

  const bioText = document.getElementById("bio").value.trim();
  const file = document.getElementById("profilePicInput").files[0];
  let profilePicUrl = null;

  if (file) {
    const fd = new FormData();
    fd.append("image", file);
    const upload = await fetch(API + "/api/media/image", { method: "POST", body: fd });
    const imgData = await upload.json();
    profilePicUrl = imgData.imageUrl;
  }

  await fetch(API + "/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ bio: bioText, profilePic: profilePicUrl })
  });

  loadProfile();
}

function openDM() {
  location.href = "chat.html?userId=" + profileUserId;
}

async function requestPersonalAccess() {
  const btn = document.getElementById("requestAccessBtn");
  await fetch(API + "/api/personal-access/request/" + profileUserId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  btn.innerText = "⏳ Request Pending";
  btn.disabled = true;
}

/* ======================
   INIT
====================== */
loadMyProfileHeader();
loadProfile();
loadPersonalAccessRequests();
