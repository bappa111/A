const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   HELPERS
====================== */
function getMyId() {
  try {
    return JSON.parse(atob(token.split(".")[1])).id;
  } catch {
    return null;
  }
}

/* ======================
   IDS
====================== */
const params = new URLSearchParams(window.location.search);
const myId = getMyId();
const profileUserId = params.get("id") || myId;

/* ======================
   LOAD PROFILE
====================== */
async function loadProfile() {
  const res = await fetch(API + "/api/users/profile/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });
  const data = await res.json();

  if (!data.user) {
    alert("User not found");
    return;
  }

  /* ======================
     FLAGS
  ====================== */
  const isOwner = profileUserId === myId;
  const isFollower =
    data.user.followers && data.user.followers.includes(myId);
  const isPrivate = data.user.isPrivate === true;

  /* ======================
     ELEMENTS
  ====================== */
  const bioInput = document.getElementById("bio");
  const postsSection = document.getElementById("postsSection");
  const postsDiv = document.getElementById("posts");
  const followList = document.getElementById("followList");
  const chatBtn = document.getElementById("chatBtn");
  const saveBtn = document.getElementById("saveBtn");
  const followBtn = document.getElementById("followBtn");
  const picInput = document.getElementById("profilePicInput");
  const img = document.getElementById("profilePic");
  const followersCount = document.getElementById("followersCount");
  const followingCount = document.getElementById("followingCount");

  /* ======================
     ALWAYS SHOW (PIC + BIO)
  ====================== */
  if (img) {
    img.src = data.user.profilePic || "https://via.placeholder.com/120";
    img.style.display = "block";
  }

  if (bioInput) {
    bioInput.value = data.user.bio || "";
    bioInput.disabled = true; // 🔒 always read-only unless owner
  }

  /* ======================
     PRIVATE PROFILE LOCK
  ====================== */
  if (isPrivate && !isOwner && !isFollower) {
    if (postsSection) postsSection.style.display = "none";
    if (followList) followList.style.display = "none";
    if (chatBtn) chatBtn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
    if (picInput) picInput.style.display = "none";

    // counts allowed, but no lists
    return; // ⛔ STOP HERE — nothing else renders
  }

  /* ======================
     OWNER PERMISSIONS
  ====================== */
  if (isOwner) {
    if (bioInput) bioInput.disabled = false;
    if (saveBtn) saveBtn.style.display = "inline-block";
    if (picInput) picInput.style.display = "inline-block";
    if (followBtn) followBtn.style.display = "none";
    if (chatBtn) chatBtn.style.display = "none";
  } else {
    if (saveBtn) saveBtn.style.display = "none";
    if (picInput) picInput.style.display = "none";
    if (chatBtn) chatBtn.style.display = "inline-block";
  }

  /* ======================
     FOLLOW COUNTS
  ====================== */
  if (followersCount)
    followersCount.innerText = data.user.followersCount || 0;
  if (followingCount)
    followingCount.innerText = data.user.followingCount || 0;

  /* ======================
     FOLLOW / UNFOLLOW
  ====================== */
  if (followBtn && !isOwner) {
    const meRes = await fetch(API + "/api/users/profile/" + myId, {
      headers: { Authorization: "Bearer " + token }
    });
    const meData = await meRes.json();

    const amIFollowing =
      meData.user.following &&
      meData.user.following.includes(profileUserId);

    followBtn.innerText = amIFollowing ? "Unfollow" : "Follow";
    followBtn.style.display = "inline-block";
  }

  /* ======================
     POSTS (ALLOWED NOW)
  ====================== */
  if (postsDiv && postsSection) {
    postsSection.style.display = "block";
    postsDiv.innerHTML = "";

    data.posts.forEach(p => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "6px";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <p>${p.content || ""}</p>
        ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
        ${
          p.video
            ? `<video controls style="max-width:100%">
                 <source src="${p.video}">
               </video>`
            : ""
        }
      `;
      postsDiv.appendChild(div);
    });
  }
}

/* ======================
   UPDATE PROFILE
====================== */
async function updateProfile() {
  if (profileUserId !== myId) return;

  const bio = document.getElementById("bio").value.trim();
  const file = document.getElementById("profilePicInput").files[0];
  let profilePicUrl = null;

  if (file) {
    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });
    const data = await res.json();
    if (!data.imageUrl) return alert("Upload failed");
    profilePicUrl = data.imageUrl;
  }

  await fetch(API + "/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ bio, profilePic: profilePicUrl })
  });

  loadProfile();
}

/* ======================
   FOLLOW
====================== */
async function toggleFollow() {
  if (profileUserId === myId) return;

  await fetch(API + "/api/users/follow/" + profileUserId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  loadProfile();
}

/* ======================
   OPEN DM
====================== */
function openDM() {
  location.href = "chat.html?userId=" + profileUserId;
}

/* ======================
   INIT
====================== */
loadProfile();
