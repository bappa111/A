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

  const isOwner = profileUserId === myId;
  const isFollower = data.user.followers.includes(myId);
  const isPrivate = data.user.isPrivate === true;

  const bio = document.getElementById("bio");
  const postsSection = document.getElementById("postsSection");
  const posts = document.getElementById("posts");
  const chatBtn = document.getElementById("chatBtn");
  const followBtn = document.getElementById("followBtn");
  const saveBtn = document.getElementById("saveBtn");
  const picInput = document.getElementById("profilePicInput");
  const img = document.getElementById("profilePic");

  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  img.style.display = "block";

  bio.value = data.user.bio || "";
  bio.disabled = !isOwner;

  if (isPrivate && !isOwner && !isFollower) {
    postsSection.style.display = "none";
    chatBtn.style.display = "none";
    saveBtn.style.display = "none";
    picInput.style.display = "none";
    followBtn.style.display = "inline-block";
    return;
  }

  if (isOwner) {
    followBtn.style.display = "none";
    chatBtn.style.display = "none";
  }

  posts.innerHTML = "";
  data.posts.forEach(p => {
    const d = document.createElement("div");
    d.innerHTML = `<p>${p.content || ""}</p>`;
    posts.appendChild(d);
  });
}

async function toggleFollow() {
  await fetch(API + "/api/users/follow/" + profileUserId, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadProfile();
}

function openDM() {
  location.href = "chat.html?userId=" + profileUserId;
}

async function updateProfile() {
  const bio = document.getElementById("bio").value;
  await fetch(API + "/api/users/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ bio })
  });
  loadProfile();
}

loadProfile();
