const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

async function loadProfile() {
  const payload = JSON.parse(atob(token.split(".")[1]));
  const userId = payload.id;

  const res = await fetch(API + "/api/users/profile/" + userId, {
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  document.getElementById("bio").value = data.user.bio || "";

  if (data.user.profilePic) {
    const img = document.getElementById("profilePic");
    img.src = data.user.profilePic;
    img.style.display = "block";
  }

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
      ${p.video ? `<video controls style="max-width:100%"><source src="${p.video}"></video>` : ""}
    `;

    postsDiv.appendChild(div);
  });
}

async function updateProfile() {
  const bio = document.getElementById("bio").value.trim();
  const file = document.getElementById("profilePicInput").files[0];

  let profilePicUrl = null;

  // upload profile pic
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
    body: JSON.stringify({
      bio,
      profilePic: profilePicUrl
    })
  });

  alert("Profile updated");
  loadProfile();
}

loadProfile();
