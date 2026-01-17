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

  // USER INFO
  document.getElementById("bio").value = data.user.bio || "";

  const img = document.getElementById("profilePic");
  img.src = data.user.profilePic || "https://via.placeholder.com/120";
  img.style.display = "block";

  // ❌ অন্য user হলে edit বন্ধ
  if (profileUserId !== myId) {
    document.getElementById("bio").disabled = true;
    document.getElementById("profilePicInput").style.display = "none";
    document.querySelector("button").style.display = "none"; // Save button
  }

  // POSTS
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

loadProfile();
