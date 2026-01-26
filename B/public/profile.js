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

  if (data.status === "approved") {
    btn.style.display = "none";
  }

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
   LOAD PROFILE
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
  const bio = document.getElementById("bio");
  const nameInput = document.getElementById("nameInput");
  const postsSection = document.getElementById("postsSection");
  const posts = document.getElementById("posts");
  const chatBtn = document.getElementById("chatBtn");
  const followBtn = document.getElementById("followBtn");
  const saveBtn = document.getElementById("saveBtn");
  const picInput = document.getElementById("profilePicInput");
  const personalBox = document.getElementById("personalPostBox");
  const requestBtn = document.getElementById("requestAccessBtn");

  saveBtn.style.display = "none";
  picInput.style.display = "none";
  chatBtn.style.display = "none";
  followBtn.style.display = "none";
  personalBox.style.display = "none";
  requestBtn.style.display = "none";
  postsSection.style.display = "block";

  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  bio.value = data.user.bio || "";
  bio.disabled = !isOwner;
  if (nameInput) {
    nameInput.value = data.user.name || "";
    nameInput.disabled = !isOwner;
  }

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

  if (isOwner) {
    saveBtn.style.display = "inline-block";
    picInput.style.display = "inline-block";
    personalBox.style.display = "block";
  }

  if (!isOwner) {
    followBtn.style.display = "inline-block";
    followBtn.innerText = isFollower ? "Unfollow" : "Follow";
    if (!isPrivate || isFollower) chatBtn.style.display = "inline-block";
  }

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
   LOAD PERSONAL POSTS
====================== */
async function loadPersonalPosts({ isOwner }) {
  const container = document.getElementById("personalPosts");
  if (!container) return;

  let hasAccess = false;

  if (!isOwner) {
    const res = await fetch(
      API + "/api/personal-access/status/" + profileUserId,
      { headers: { Authorization: "Bearer " + token } }
    );
    const data = await res.json();
    hasAccess = data.status === "approved";
  }

  if (!isOwner && !hasAccess) {
    container.innerHTML = `
      <p style="color:#888">🔒 Personal posts are private</p>
      <button onclick="requestPersonalAccess()">Request Access</button>
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
      ${p.image ? `<img src="${p.image}" style="max-width:100%;margin-top:6px">` : ""}
      ${p.video ? `
        <video controls style="max-width:100%;margin-top:6px">
          <source src="${p.video}">
        </video>` : ""}
      <div style="font-size:12px;color:#666">
        ${new Date(p.createdAt).toLocaleString()}
      </div>

      ${isOwner ? `
        <button onclick='editPersonalPost(
          "${p._id}",
          ${JSON.stringify(p.content || "")},
          ${JSON.stringify(p.image || "")},
          ${JSON.stringify(p.video || "")}
        )'>✏️ Edit</button>

        <button style="color:red"
          onclick="deletePersonalPost('${p._id}')">🗑 Delete</button>
      ` : ""}
    `;
    container.appendChild(div);
  });
}

/* ======================
   EDIT / DELETE PERSONAL POST
====================== */
async function editPersonalPost(id, oldText, oldImage, oldVideo) {
  const newText = prompt("Edit post:", oldText);
  if (newText === null) return;

  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/*,video/*";

  file.onchange = async () => {
    let image = oldImage || null;
    let video = oldVideo || null;

    if (file.files[0]) {
      const f = file.files[0];
      const fd = new FormData();

      if (f.type.startsWith("video")) {
        fd.append("video", f);
        const up = await fetch(API + "/api/media/video", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: fd
        });
        const d = await up.json();
        video = d.videoUrl;
        image = null;
      } else {
        fd.append("image", f);
        const up = await fetch(API + "/api/media/image", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: fd
        });
        const d = await up.json();
        image = d.imageUrl;
        video = null;
      }
    }

    await fetch(API + "/api/personal-posts/" + id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ content: newText, image, video })
    });

    loadProfile();
  };

  file.click();
}

async function deletePersonalPost(id) {
  if (!confirm("Delete this personal post?")) return;

  await fetch(API + "/api/personal-posts/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });

  loadProfile();
}

/* ======================
   CREATE PERSONAL POST
====================== */
async function createPersonalPost() {
  const text = document.getElementById("personalPostText").value.trim();
  const file = document.getElementById("personalPostMedia").files[0];

  if (!text && !file) {
    alert("Write something or select image/video");
    return;
  }

  let image = null;
  let video = null;

  if (file) {
    if (file.type.startsWith("video")) {
      const res = await uploadWithProgress({
        url: API + "/api/media/video",
        file,
        field: "video"
      });
      video = res.videoUrl;
    } else {
      const res = await uploadWithProgress({
        url: API + "/api/media/image",
        file,
        field: "image"
      });
      image = res.imageUrl;
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

  document.getElementById("personalPostText").value = "";
  document.getElementById("personalPostMedia").value = "";

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

  if (!res.ok) {
    alert(data.msg || "Profile update failed");
    return;
  }

  loadProfile();
}

function openDM() {
  location.href = "chat.html?userId=" + profileUserId;
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

/*percentage*/
function uploadWithProgress({ url, file, field = "image" }) {
  return new Promise((resolve, reject) => {
    const overlay = document.getElementById("uploadOverlay");
    const percentText = document.getElementById("uploadPercent");

    overlay.style.display = "flex";
    percentText.innerText = "0%";

    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append(field, file);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        percentText.innerText = percent + "%";
      }
    };

    xhr.onload = () => {
      overlay.style.display = "none";
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        alert("Upload failed");
        reject();
      }
    };

    xhr.onerror = () => {
      overlay.style.display = "none";
      alert("Upload error");
      reject();
    };

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.send(fd);
  });
}

/* ======================
   INIT
====================== */
loadMyProfileHeader();
loadProfile();
