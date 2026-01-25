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
   PROFILE HEADER NAME
====================== */
async function loadMyProfileHeader() {
  if (!token) return;

  const res = await fetch(API + "/api/users/profile/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  const title = document.getElementById("profileTitle");

  if (title && data.user?.name) {
    title.innerText = data.user.name;
  }
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

  // ELEMENTS
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
    await loadPersonalPosts({ isOwner, isFollower, isPrivate });
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
      ${p.image ? `<img src="${p.image}" style="max-width:100%;margin-top:6px">` : ""}
      ${p.video ? `<video controls style="max-width:100%;margin-top:6px"><source src="${p.video}"></video>` : ""}
    `;
    posts.appendChild(div);
  });

  await loadPersonalPosts({ isOwner, isFollower, isPrivate });
}

/* ======================
   PERSONAL POSTS
====================== */
async function loadPersonalPosts({ isOwner, isFollower, isPrivate }) {
  const container = document.getElementById("personalPosts");
  if (!container) return;

  if (!isOwner && isPrivate && !isFollower) {
    container.innerHTML = "<p style='color:#888'>🔒 Personal posts are private</p>";
    return;
  }

  try {
    const res = await fetch(API + "/api/personal-posts/" + profileUserId, {
      headers: { Authorization: "Bearer " + token }
    });

    const list = await res.json();
    container.innerHTML = "";

    if (!list.length) {
      container.innerHTML = "<p style='color:#888'>No personal posts</p>";
      return;
    }

    list.forEach(p => {
      const div = document.createElement("div");
      div.style.border = "1px dashed #aaa";
      div.style.padding = "8px";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <p>${p.content}</p>
        <div style="font-size:12px;color:#666">
          ${new Date(p.createdAt).toLocaleString()}
        </div>
      `;
      container.appendChild(div);
    });
  } catch (e) {
    container.innerHTML = "<p>Error loading personal posts</p>";
  }
}

/* ======================
   CREATE PERSONAL POST
====================== */
async function createPersonalPost() {
  const input = document.getElementById("personalPostText");
  if (!input || !input.value.trim()) return;

  await fetch(API + "/api/personal-posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ content: input.value.trim() })
  });

  input.value = "";
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

/* ======================
   INIT
====================== */
loadMyProfileHeader();
loadProfile();
