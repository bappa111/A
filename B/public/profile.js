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

let socket = null;
if (token) {
  socket = io(API, { query: { userId: myId } });
}

/* ======================
   SOCKET (FINAL FIX)
   ⚠️ socket শুধু reload করবে
====================== */
socket.on("profile-updated", data => {
  if (data.userId !== profileUserId) return;
  loadProfile(); // 🔥 ONLY THIS
});

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
  if (data.status === "approved") btn.style.display = "none";
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
   LOAD PROFILE (FINAL & SAFE)
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
  const nameInput = document.getElementById("nameInput");
  const bio = document.getElementById("bio");
  const editBtn = document.getElementById("editProfileBtn");
  const saveBtn = document.getElementById("saveBtn");
  const picInput = document.getElementById("profilePicInput");

  const postsSection = document.getElementById("postsSection");
  const posts = document.getElementById("posts");
  const personalBox = document.getElementById("personalPostBox");

  const chatBtn = document.getElementById("chatBtn");
  const followBtn = document.getElementById("followBtn");
  const requestBtn = document.getElementById("requestAccessBtn");

  /* 🔒 UNIVERSAL RESET (CRITICAL) */
  nameInput.disabled = true;
  bio.disabled = true;

  editBtn.style.display = "none";
  saveBtn.style.display = "none";
  picInput.style.display = "none";
  personalBox.style.display = "none";

  chatBtn.style.display = "none";
  followBtn.style.display = "none";
  requestBtn.style.display = "none";
  postsSection.style.display = "block";

  /* BASIC DATA */
  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  nameInput.value = data.user.name || "";
  bio.value = data.user.bio || "";

  /* OWNER UI */
  if (isOwner) {
    editBtn.style.display = "inline-block";
    picInput.style.display = "inline-block";
    personalBox.style.display = "block";
  }

  /* PRIVATE PROFILE */
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

  /* FOLLOW / CHAT */
  if (!isOwner) {
    followBtn.style.display = "inline-block";
    followBtn.innerText = isFollower ? "Unfollow" : "Follow";
    if (!isPrivate || isFollower) chatBtn.style.display = "inline-block";
  }

  /* POSTS */
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
   EDIT / SAVE PROFILE
====================== */
function enableProfileEdit() {
  if (profileUserId !== myId) return;
  document.getElementById("nameInput").disabled = false;
  document.getElementById("bio").disabled = false;
  document.getElementById("saveBtn").style.display = "inline-block";
}

async function updateProfile() {
  if (profileUserId !== myId) return;

  const nameText = document.getElementById("nameInput").value.trim();
  const bioText = document.getElementById("bio").value.trim();
  const file = document.getElementById("profilePicInput").files[0];

  let profilePicUrl = null;
  if (file) {
    const fd = new FormData();
    fd.append("image", file);
    const up = await fetch(API + "/api/media/image", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: fd
    });
    const d = await up.json();
    profilePicUrl = d.imageUrl;
  }

  const res = await fetch(API + "/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ name: nameText, bio: bioText, profilePic: profilePicUrl })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.msg || "Profile update failed");

  loadProfile();
}

/* ======================
   INIT
====================== */
loadMyProfileHeader();
loadProfile();
