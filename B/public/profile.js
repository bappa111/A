const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

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

async function loadProfile() {
  const res = await fetch(API + "/api/users/profile/" + profileUserId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();
  if (!data.user) return alert("User not found");

  const isOwner = profileUserId === myId;
  const isFollower = data.user.followers.some(
    id => id.toString() === myId
  );
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

  /* ======================
     RESET UI (IMPORTANT)
  ====================== */
  saveBtn.style.display = "none";
  picInput.style.display = "none";
  chatBtn.style.display = "none";
  followBtn.style.display = "none";
  postsSection.style.display = "block";

  /* ======================
     BASIC INFO (ALWAYS)
  ====================== */
  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  img.style.display = "block";

  bio.value = data.user.bio || "";
  bio.disabled = !isOwner;

  followersCount.innerText = data.user.followersCount || 0;
  followingCount.innerText = data.user.followingCount || 0;

  /* ======================
     PRIVATE PROFILE LOCK
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

  document.getElementById("followersCount").innerText =
    data.followersCount ?? document.getElementById("followersCount").innerText;

  document.getElementById("followingCount").innerText =
    data.followingCount ?? document.getElementById("followingCount").innerText;

  loadProfile();
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

function openDM() {
  location.href = "chat.html?userId=" + profileUserId;
}

loadProfile();


/* ======================
   FOLLOW POPUP (FINAL)
====================== */

function closeModal() {
  document.getElementById("followModal").style.display = "none";
}

async function openFollowers() {
  await openFollowList("followers");
}

async function openFollowing() {
  await openFollowList("following");
}

async function openFollowList(type) {
  const modal = document.getElementById("followModal");
  const list = document.getElementById("modalList");
  const title = document.getElementById("modalTitle");

  modal.style.display = "block";
  list.innerHTML = "Loading...";

  title.innerText = type === "followers" ? "Followers" : "Following";

  list.innerHTML = "";

  /* ======================
     🔔 FOLLOW REQUESTS (ONLY OWNER + FOLLOWERS TAB)
  ====================== */
  if (type === "followers" && profileUserId === myId) {
    const profileRes = await fetch(
      API + "/api/users/profile/" + myId,
      { headers: { Authorization: "Bearer " + token } }
    );
    const profileData = await profileRes.json();

    const requests = profileData.user.followRequests || [];

    if (requests.length) {
      const h = document.createElement("h4");
      h.innerText = "Follow Requests";
      list.appendChild(h);

      for (let uid of requests) {
        const uRes = await fetch(
          API + "/api/users/profile/" + uid,
          { headers: { Authorization: "Bearer " + token } }
        );
        const uData = await uRes.json();

        const div = document.createElement("div");
        div.style.marginBottom = "10px";

        div.innerHTML = `
          <b>${uData.user.name}</b><br>
          <button onclick="acceptFollow('${uid}')">Accept</button>
          <button onclick="rejectFollow('${uid}')">Reject</button>
          <hr>
        `;

        list.appendChild(div);
      }
    }
  }

  /* ======================
     👥 FOLLOWERS / FOLLOWING LIST
  ====================== */
  const res = await fetch(
    API + "/api/users/" + profileUserId + "/" + type,
    { headers: { Authorization: "Bearer " + token } }
  );

  const users = await res.json();

  if (!users.length) {
    list.innerHTML += "<p>No users</p>";
    return;
  }

  users.forEach(u => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "10px";
    div.style.marginBottom = "8px";
    div.style.cursor = "pointer";

    div.innerHTML = `
      <img src="${u.profilePic || "https://via.placeholder.com/40"}"
           width="40" height="40" style="border-radius:50%">
      <b>${u.name}</b>
    `;

    div.onclick = () => {
      location.href = "profile.html?id=" + u._id;
    };

    list.appendChild(div);
  });
}

/* ======================
   ACCEPT / REJECT
====================== */
async function acceptFollow(userId) {
  await fetch(API + "/api/users/follow-accept/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  loadProfile();
  openFollowers();
}

async function rejectFollow(userId) {
  await fetch(API + "/api/users/follow-reject/" + userId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });

  openFollowers();
}
