const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   CREATE POST
====================== */
async function createPost() {
  const text = document.getElementById("postText").value.trim();
  const imgFile = document.getElementById("postImage").files[0];
  const vidFile = document.getElementById("postVideo").files[0];

  let imageUrl = null;
  let videoUrl = null;

  // IMAGE UPLOAD
  if (imgFile) {
    const fd = new FormData();
    fd.append("image", imgFile);

    const res = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    imageUrl = data.imageUrl;
  }

  // VIDEO UPLOAD
  if (vidFile) {
    const fd = new FormData();
    fd.append("video", vidFile);

    const res = await fetch(API + "/api/media/video", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    videoUrl = data.videoUrl;
  }

  // CREATE POST
  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      content: text,
      image: imageUrl,
      video: videoUrl
    })
  });

  // reset
  document.getElementById("postText").value = "";
  document.getElementById("postImage").value = "";
  document.getElementById("postVideo").value = "";

  loadFeed();
}

/* ======================
   LOAD FEED
====================== */
async function loadFeed() {
  const res = await fetch(API + "/api/posts", {
    headers: { Authorization: "Bearer " + token }
  });

  const posts = await res.json();
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "8px";

    let html = `<b>${p.userId?.name || "User"}</b>`;

    if (p.content) html += `<p>${p.content}</p>`;
    if (p.image) html += `<img src="${p.image}" style="max-width:200px;display:block">`;
    if (p.video) html += `<video src="${p.video}" controls style="max-width:250px;display:block"></video>`;

    html += `
      <button>👍 Like</button>
      <button>💬 Comment</button>
    `;

    div.innerHTML = html;
    feed.appendChild(div);
  });
}

loadFeed();
