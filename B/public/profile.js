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
   SOCKET (SAFE & SIMPLE)
====================== */
let socket = null;
if (token && typeof io !== "undefined") {
  socket = io(API, { query: { userId: myId } });

  socket.on("profile-updated", data => {
    if (data.userId !== profileUserId) return;
    loadProfile(); // only reload profile
  });
}

/* ======================
   PERSONAL ACCESS STATUS
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
  } else if (data.status === "approved") {
    btn.style.display = "none";
  } else if (data.status === "rejected") {
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
  if (title && data.user?.name) {
    title.innerText = data.user.name;
  }
}

/* ======================
   LOAD PROFILE (FINAL)
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

  /* ELEMENTS */
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

  /* ========== UNIVERSAL RESET (IMPORTANT) ========== */
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
  img.onclick = openFullPic;
  img.style.cursor = "pointer";
  nameInput.value = data.user.name || "";
  bio.value = data.user.bio || "";
  document.getElementById("followersCount").innerText =
    data.user.followersCount ?? data.user.followers.length;

  document.getElementById("followingCount").innerText =
    data.user.followingCount ?? data.user.following.length;

/* OWNER UI */
if (isOwner) {
  editBtn.style.display = "inline-block";
  picInput.style.display = "inline-block";
  personalBox.style.display = "block";

  // 🔥 OWNER ACCESS REQUESTS LOAD
  loadAccessRequests();
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

    if (!isPrivate || isFollower) {
      chatBtn.style.display = "inline-block";
    }
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
   PERSONAL POSTS
====================== */
async function loadPersonalPosts({ isOwner }) {
  const container = document.getElementById("personalPosts");
  if (!container) return;

  let hasAccess = isOwner;

  if (!isOwner) {
    const res = await fetch(
      API + "/api/personal-access/status/" + profileUserId,
      { headers: { Authorization: "Bearer " + token } }
    );
    const data = await res.json();
    hasAccess = data.status === "approved";
  }

if (!hasAccess) {
  const res = await fetch(
    API + "/api/personal-access/status/" + profileUserId,
    { headers: { Authorization: "Bearer " + token } }
  );
  const statusData = await res.json();

  let msg = "🔒 Personal posts are private";
  let btnHtml = "";

  if (statusData.status === "pending") {
    msg = "⏳ Access request sent. Waiting for approval.";
    btnHtml = `<button disabled>Request Sent</button>`;
  } else if (statusData.status === "rejected") {
    msg = "❌ Request rejected. You can try again.";
    btnHtml = `<button onclick="requestPersonalAccess()">Request Again</button>`;
  } else {
    btnHtml = `<button onclick="requestPersonalAccess()">Request Access</button>`;
  }

  container.innerHTML = `
    <p style="color:#888">${msg}</p>
    ${btnHtml}
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

  list.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px dashed #aaa";
    div.style.padding = "8px";
    div.style.marginBottom = "8px";

    div.innerHTML = `
      <p>${p.content || ""}</p>
      ${p.image ? `<img src="${p.image}" style="max-width:100%">` : ""}
      ${p.video ? `<video controls style="max-width:100%"><source src="${p.video}"></video>` : ""}
      <div style="font-size:12px;color:#666">
        ${new Date(p.createdAt).toLocaleString()}
      </div>
    `;
    container.appendChild(div);
  });
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

/*upload profile*/
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
    body: JSON.stringify({
      name: nameText,
      bio: bioText,
      profilePic: profilePicUrl
    })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.msg || "Profile update failed");

  // 🔥 THIS IS THE FIX (RIGHT PLACE)
  if (profilePicUrl) {
    document.getElementById("profilePic").src = profilePicUrl;
  }

  loadProfile();
}

/* ======================
   FOLLOW / CHAT
====================== */
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
/* ======================
   FULL SCREEN PROFILE PIC
====================== */
function openFullPic() {
  const img = document.getElementById("profilePic");
  const fullImg = document.getElementById("fullPicImg");
  const overlay = document.getElementById("fullPicOverlay");

  if (!img || !img.src) return;

  fullImg.src = img.src;
  overlay.style.display = "block";
}

function closeFullPic() {
  document.getElementById("fullPicOverlay").style.display = "none";
}
/*pic download*/
function downloadProfilePic(e) {
  e.stopPropagation();

  const img = document.getElementById("fullPicImg");
  if (!img || !img.src) return;

  const a = document.createElement("a");
  a.href = img.src;
  a.download =
    (document.getElementById("profileTitle")?.innerText || "profile") +
    ".jpg";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
// ... উপরের সব code

async function openFollowers() {
  const res = await fetch(
    API + "/api/users/" + profileUserId + "/followers",
    { headers: { Authorization: "Bearer " + token } }
  );
  const list = await res.json();
  showFollowModal("Followers", list);
}

async function openFollowing() {
  const res = await fetch(
    API + "/api/users/" + profileUserId + "/following",
    { headers: { Authorization: "Bearer " + token } }
  );
  const list = await res.json();
  showFollowModal("Following", list);
}

/* 🔥 ঠিক এখানেই বসাবে */
function showFollowModal(title, users) {
  const modal = document.getElementById("followModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalList = document.getElementById("modalList");

  modalTitle.innerText = title;
  modalList.innerHTML = "";

  if (!users.length) {
    modalList.innerHTML = "<p>No users</p>";
  } else {
    users.forEach(u => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.gap = "10px";
      div.style.marginBottom = "8px";

      div.innerHTML = `
        <img src="${u.profilePic || 'https://via.placeholder.com/40'}"
             width="40" height="40" style="border-radius:50%">
        <a href="profile.html?id=${u._id}">${u.name}</a>
      `;
      modalList.appendChild(div);
    });
  }

  modal.style.display = "block";
}

function closeModal() {
  document.getElementById("followModal").style.display = "none";
}

async function createPersonalPost() {
  const text = document.getElementById("personalPostText").value.trim();
  const fileInput = document.getElementById("personalPostMedia");
  const file = fileInput.files[0];

  if (!text && !file) {
    alert("Write something or select image/video");
    return;
  }

  let image = null;
  let video = null;

  if (file) {
    const fd = new FormData();

    if (file.type.startsWith("video")) {
      fd.append("video", file);
      const up = await fetch(API + "/api/media/video", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd
      });
      const d = await up.json();
      video = d.videoUrl;
    } else {
      fd.append("image", file);
      const up = await fetch(API + "/api/media/image", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd
      });
      const d = await up.json();
      image = d.imageUrl;
    }
  }

  await fetch(API + "/api/personal-posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ content: text, image, video })
  });

  // reset UI
  document.getElementById("personalPostText").value = "";
  fileInput.value = "";

  // 🔥 reload only personal posts
  loadPersonalPosts({ isOwner: true });
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

async function loadAccessRequests() {
  const box = document.getElementById("personalAccessRequests");
  const list = document.getElementById("accessRequestList");
  if (!box || !list) return;

  const res = await fetch(API + "/api/personal-access/requests", {
    headers: { Authorization: "Bearer " + token }
  });
  const requests = await res.json();

  if (!requests.length) {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  list.innerHTML = "";

  requests.forEach(r => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "6px";

    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${r.requester.profilePic || 'https://via.placeholder.com/40'}"
             width="40" height="40" style="border-radius:50%">
        <b>${r.requester.name}</b>
      </div>
      <button onclick="approveAccess('${r._id}')">✅ Approve</button>
      <button onclick="rejectAccess('${r._id}')">❌ Reject</button>
    `;

    list.appendChild(div);
  });
}

async function approveAccess(id) {
  await fetch(API + "/api/personal-access/approve/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadAccessRequests();
}

async function rejectAccess(id) {
  await fetch(API + "/api/personal-access/reject/" + id, {
    method: "POST",
    headers: { Authorization: "Bearer " + token }
  });
  loadAccessRequests();
}
/* ======================
   INIT
====================== */
loadMyProfileHeader();
loadProfile();
