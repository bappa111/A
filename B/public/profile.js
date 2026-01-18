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
const profileUserId = params.get("id") || getMyId();
const myId = getMyId();

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
     FLAGS (VERY IMPORTANT)
  ====================== */
  const isOwner = profileUserId === myId;

  const isFollower =
    data.user.followers &&
    data.user.followers.includes(myId);

  const isPrivate = data.user.isPrivate === true;

  /* ======================
     PRIVATE PROFILE RESTRICTION
  ====================== */
  if (isPrivate && !isOwner && !isFollower) {
    const bio = document.getElementById("bio");
    const posts = document.getElementById("posts");
    const followList = document.getElementById("followList");
    const chatBtn = document.getElementById("chatBtn");

    if (bio) bio.style.display = "none";
    if (posts) posts.style.display = "none";
    if (followList) followList.style.display = "none";
    if (chatBtn) chatBtn.style.display = "none";
  }

  /* ======================
     CHAT BUTTON (FINAL LOGIC)
  ====================== */
  const chatBtn = document.getElementById("chatBtn");
  if (chatBtn) {
    if (isOwner || (isPrivate && !isFollower)) {
      chatBtn.style.display = "none";
    } else {
      chatBtn.style.display = "inline-block";
    }
  }

  /* ======================
     USER INFO
  ====================== */
  const bioInput = document.getElementById("bio");
  if (bioInput) bioInput.value = data.user.bio || "";

  const img = document.getElementById("profilePic");
  if (img) {
    img.src = data.user.profilePic || "https://via.placeholder.com/120";
    img.style.display = "block";
  }

  /* ======================
     FOLLOW COUNTS
  ====================== */
  const followersCount = document.getElementById("followersCount");
  const followingCount = document.getElementById("followingCount");

  if (followersCount) followersCount.innerText = data.user.followersCount || 0;
  if (followingCount) followingCount.innerText = data.user.followingCount || 0;

  /* ======================
     BUTTON PERMISSIONS
  ====================== */
  const saveBtn = document.getElementById("saveBtn");
  const followBtn = document.getElementById("followBtn");
  const picInput = document.getElementById("profilePicInput");

  if (!isOwner) {
    if (bioInput) bioInput.disabled = true;
    if (picInput) picInput.style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
  }

  /* ======================
     FOLLOW / UNFOLLOW BUTTON
  ====================== */
  if (followBtn) {
    if (isOwner) {
      followBtn.style.display = "none";
    } else {
      followBtn.style.display = "inline-block";

      const meRes = await fetch(API + "/api/users/profile/" + myId, {
        headers: { Authorization: "Bearer " + token }
      });
      const meData = await meRes.json();

      const amIFollowing =
        meData.user.following &&
        meData.user.following.includes(profileUserId);

      followBtn.innerText = amIFollowing ? "Unfollow" : "Follow";
    }
  }

  /* ======================
     POSTS
  ====================== */
  const postsDiv = document.getElementById("posts");
  if (postsDiv) {
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
    if (!data.imageUrl) {
      alert("Profile pic upload failed");
      return;
    }
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

  alert("Profile updated");
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
   FOLLOW LIST
====================== */
async function openFollowers() {
  const res = await fetch(API + "/api/users/" + profileUserId + "/followers", {
    headers: { Authorization: "Bearer " + token }
  });
  const users = await res.json();
  renderFollowList(users, "Followers");
}

async function openFollowing() {
  const res = await fetch(API + "/api/users/" + profileUserId + "/following", {
    headers: { Authorization: "Bearer " + token }
  });
  const users = await res.json();
  renderFollowList(users, "Following");
}

function renderFollowList(users, title) {
  const div = document.getElementById("followList");
  if (!div) return;

  div.innerHTML = `<h4>${title}</h4>`;

  users.forEach(u => {
    div.innerHTML += `
      <div
        style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px"
        onclick="location.href='profile.html?id=${u._id}'"
      >
        <img
          src="${u.profilePic || 'https://via.placeholder.com/32'}"
          style="width:32px;height:32px;border-radius:50%"
        />
        <b>${u.name}</b>
      </div>
    `;
  });
}

/* ======================
   OPEN DM (PROFILE → CHAT)
====================== */
function openDM() {
  if (!profileUserId) return;
  location.href = "chat.html?userId=" + profileUserId;
}

/* ======================
   INIT
====================== */
loadProfile();
