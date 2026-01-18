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
  const chatBtn = document.getElementById("chatBtn");
  const followBtn = document.getElementById("followBtn");
  const saveBtn = document.getElementById("saveBtn");
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
    bioInput.disabled = !isOwner;
  }

  if (followersCount)
    followersCount.innerText = data.user.followersCount || 0;
  if (followingCount)
    followingCount.innerText = data.user.followingCount || 0;

  /* ======================
     🔒 PRIVATE PROFILE LOCK
  ====================== */
  if (isPrivate && !isOwner && !isFollower) {
    if (postsSection) postsSection.style.display = "none";
    if (chatBtn) chatBtn.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
    if (picInput) picInput.style.display = "none";

    if (followBtn) followBtn.style.display = "inline-block";
    return; // ⛔ STOP HERE
  }

  /* ======================
     OWNER / VISITOR CONTROLS
  ====================== */
  if (isOwner) {
    if (saveBtn) saveBtn.style.display = "inline-block";
    if (picInput) picInput.style.display = "inline-block";
    if (followBtn) followBtn.style.display = "none";
    if (chatBtn) chatBtn.style.display = "none";
  } else {
    if (saveBtn) saveBtn.style.display = "none";
    if (picInput) picInput.style.display = "none";
    if (chatBtn) chatBtn.style.display = "inline-block";
    if (followBtn) followBtn.style.display = "inline-block";
  }

  /* ======================
     POSTS (TEXT + IMAGE + VIDEO)
  ====================== */
  if (postsSection && postsDiv) {
    postsSection.style.display = "block";
    postsDiv.innerHTML = "";

    data.posts.forEach(p => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.padding = "8px";
      div.style.marginBottom = "10px";

      div.innerHTML = `
        <p>${p.content || ""}</p>

        ${p.image ? `<img src="${p.image}" style="max-width:100%;margin-top:6px">` : ""}

        ${
          p.video
            ? `<video controls style="max-width:100%;margin-top:6px">
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
   UPDATE PROFILE (OWNER)
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
    if (!data.imageUrl) return alert("Image upload failed");
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
   FOLLOW / UNFOLLOW
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
   OPEN CHAT
====================== */
function openDM() {
  location.href = "chat.html?userId=" + profileUserId;
}

/* ======================
   INIT
====================== */
loadProfile();
