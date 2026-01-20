const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   GET MY ID FROM TOKEN
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
   LOAD PROFILE
====================== */
async function loadProfile() {
  const res = await fetch(API + "/api/users/profile/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  if (!data.user) return alert("User not found");

  /* ======================
     FLAGS (🔥 FIXED)
  ====================== */
  const isOwner = profileUserId === myId;
  const isFollower = data.user.followers.some(
    id => id.toString() === myId
  );
  const isPrivate = data.user.isPrivate === true;

  /* ======================
     ELEMENTS
  ====================== */
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

  /* ======================
     FORCE HIDE ALL (🔥 IMPORTANT)
  ====================== */
  saveBtn.style.display = "none";
  picInput.style.display = "none";
  chatBtn.style.display = "none";
  followBtn.style.display = "none";

  /* ======================
     BASIC INFO
  ====================== */
  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  img.style.display = "block";

  bio.value = data.user.bio || "";
  bio.disabled = !isOwner;

  followersCount.innerText = data.user.followersCount || 0;
  followingCount.innerText = data.user.followingCount || 0;

  /* ======================
     🔒 PRIVATE PROFILE LOCK
  ====================== */
  if (isPrivate && !isOwner && !isFollower) {
    postsSection.style.display = "none";
    followBtn.style.display = "inline-block";
    followBtn.innerText = "Follow";
    return;
  }

  /* ======================
     OWNER UI
  ====================== */
  if (isOwner) {
    saveBtn.style.display = "inline-block";
    picInput.style.display = "inline-block";
  } 
  /* ======================
     VISITOR UI
  ====================== */
  else {
    followBtn.style.display = "inline-block";
    followBtn.innerText = isFollower ? "Unfollow" : "Follow";

    if (!isPrivate || isFollower) {
      chatBtn.style.display = "inline-block";
    }
  }

  /* ======================
     POSTS RENDER
  ====================== */
  postsSection.style.display = "block";
  posts.innerHTML = "";

  data.posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "10px";

    div.innerHTML = `
      <p>${p.content || ""}</p>

      ${p.image ? `<img src="${p.image}" style="max-width:100%;margin-top:6px">` : ""}

      ${p.video ? `
        <video controls style="max-width:100%;margin-top:6px">
          <source src="${p.video}">
        </video>
      ` : ""}
    `;

    posts.appendChild(div);
  });
}

/* ======================
   FOLLOW / UNFOLLOW
====================== */
async function toggleFollow() {
  const res = await fetch(API + "/api/users/follow/" + profileUserId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  if (data.followed === true) {
    followBtn.innerText = "Unfollow";
  } else if (data.followed === false) {
    followBtn.innerText = "Follow";
  }

  if (data.followersCount !== undefined) {
    document.getElementById("followersCount").innerText =
      data.followersCount;
  }

  if (data.followingCount !== undefined) {
    document.getElementById("followingCount").innerText =
      data.followingCount;
  }
}

/* ======================
   UPDATE PROFILE
====================== */
async function updateProfile() {
  if (profileUserId !== myId) return;

  const bioText = document.getElementById("bio").value.trim();
  const file = document.getElementById("profilePicInput").files[0];

  let profilePicUrl = null;

  if (file) {
    const fd = new FormData();
    fd.append("image", file);

    const upload = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });

    const imgData = await upload.json();
    profilePicUrl = imgData.imageUrl;
  }

  await fetch(API + "/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      bio: bioText,
      profilePic: profilePicUrl
    })
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
