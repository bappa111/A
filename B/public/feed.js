const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   CREATE POST
====================== */
async function createPost() {
  const text = document.getElementById("postText").value.trim();
  const videoFile = document.getElementById("postVideo").files[0];

  if (!text && !videoFile) {
    return alert("Write something or select video");
  }

  let videoUrl = null;

  // 1️⃣ upload video if exists
  if (videoFile) {
    const fd = new FormData();
    fd.append("video", videoFile);

    const uploadRes = await fetch(API + "/api/media/video", {
      method: "POST",
      body: fd
    });

    const uploadData = await uploadRes.json();
    if (!uploadData.videoUrl) {
      alert("Video upload failed");
      return;
    }

    videoUrl = uploadData.videoUrl;
  }

  // 2️⃣ create post
  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      content: text,
      video: videoUrl
    })
  });

  document.getElementById("postText").value = "";
  document.getElementById("postVideo").value = "";

  loadFeed();
}

/* ======================
   LOAD FEED  ✅ THIS WAS MISSING
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
    div.style.marginBottom = "10px";

    div.innerHTML = `
      <b>${p.userId?.name || "User"}</b>
      <p>${p.content || ""}</p>

      ${p.video ? `
        <video controls style="max-width:100%;margin-top:6px">
          <source src="${p.video}">
        </video>
      ` : ""}

      <button>👍 Like</button>
      <button>💬 Comment</button>
    `;

    feed.appendChild(div);
  });
}

// 🔥 VERY IMPORTANT
loadFeed();
