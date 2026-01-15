const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   CREATE POST
====================== */
async function createPost() {
  const text = document.getElementById("postText").value.trim();
  const imageFile = document.getElementById("postImage").files[0];
  const videoFile = document.getElementById("postVideo").files[0];

  if (!text && !imageFile && !videoFile) {
    return alert("Write something or select image/video");
  }

  let imageUrl = null;
  let videoUrl = null;

  // IMAGE
  if (imageFile) {
    const fd = new FormData();
    fd.append("image", imageFile);

    const res = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    imageUrl = data.imageUrl || null;
  }

  // VIDEO
  if (videoFile) {
    const fd = new FormData();
    fd.append("video", videoFile);

    const res = await fetch(API + "/api/media/video", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    videoUrl = data.videoUrl || null;
  }

  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({
      content: text || "",
      image: imageUrl,
      video: videoUrl
    })
  });

  document.getElementById("postText").value = "";
  document.getElementById("postImage").value = "";
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

  ${p.image ? `
    <img src="${p.image}" style="max-width:100%;margin-top:6px" />
  ` : ""}

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
