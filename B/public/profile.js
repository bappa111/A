const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

// 🔑 logged-in user id
function getMyId() {
  try {
    return JSON.parse(atob(token.split(".")[1])).id;
  } catch {
    return null;
  }
}

// 🔑 profile user id (URL > fallback to own)
const params = new URLSearchParams(window.location.search);
const profileUserId = params.get("id") || getMyId();
const myId = getMyId();

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
     USER INFO
  ====================== */
  const bioInput = document.getElementById("bio");
  bioInput.value = data.user.bio || "";

  const img = document.getElementById("profilePic");
  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  img.style.display = "block";

  /* ======================
     EDIT PERMISSION
  ====================== */
  const saveBtn = document.getElementById("saveBtn");
  const followBtn = document.getElementById("followBtn");

  if (profileUserId !== myId) {
    bioInput.disabled = true;
    document.getElementById("profilePicInput").style.display = "none";
    if (saveBtn) saveBtn.style.display = "none";
  }

  /* ======================
     FOLLOW / UNFOLLOW LOGIC  ✅ FIXED (INSIDE FUNCTION)
  ====================== */
  if (followBtn) {
    if (profileUserId === myId) {
      followBtn.style.display = "none";
    } else {
      followBtn.style.display = "inline-block";

      const meRes = await fetch(API + "/api/users/profile/" + myId, {
        headers: { Authorization: "Bearer " + token }
      });
      const meData = await meRes.json();

      const isFollowing =
        meData.user.following &&
        meData.user.following.includes(profileUserId);

      followBtn.innerText = isFollowing ? "Unfollow" : "Follow";
    }
  }

  /* ======================
     POSTS
  ====================== */
  const postsDiv = document.getElementById("posts");
  postsDiv.innerHTML = "";

  data.posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "6px";
    div.style.marginBottom = "8px";

    div.innerHTML = `
      <p>${p.content || ""}</p>
      ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
      ${p.video ? `
        <video controls style="max-width:100%">
          <source src="${p.video}">
        </video>
      ` : ""}
    `;

    postsDiv.appendChild(div);
  });
}

/* ======================
   UPDATE PROFILE (ONLY OWN)
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

  const res = await fetch(API + "/api/users/follow/" + profileUserId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  document.getElementById("followBtn").innerText =
    data.followed ? "Unfollow" : "Follow";

  loadProfile();
}

/* ======================
   INITIAL LOAD
====================== */
loadProfile();
