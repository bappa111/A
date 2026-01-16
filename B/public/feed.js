const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

/* ======================
   HELPERS
====================== */
function getMyUserId() {
  try {
    return JSON.parse(atob(token.split(".")[1])).id;
  } catch {
    return null;
  }
}

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

  // IMAGE UPLOAD
  if (imageFile) {
    const fd = new FormData();
    fd.append("image", imageFile);

    const res = await fetch(API + "/api/media/image", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!data.imageUrl) return alert("Image upload failed");
    imageUrl = data.imageUrl;
  }

  // VIDEO UPLOAD
  if (videoFile) {
    const fd = new FormData();
    fd.append("video", videoFile);

    const res = await fetch(API + "/api/media/video", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!data.videoUrl) return alert("Video upload failed");
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
   LOAD FEED
====================== */
async function loadFeed() {
  const res = await fetch(API + "/api/posts", {
    headers: { Authorization: "Bearer " + token }
  });

  const posts = await res.json();
  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  const myId = getMyUserId();

  posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "12px";

    div.innerHTML = `
      <b>${p.userId?.name || "User"}</b>
      <p>${p.content || ""}</p>

      ${p.image ? `
        <img src="${p.image}" style="max-width:100%;margin-top:6px" />
      ` : ""}

      ${p.video ? `
        <video controls style="max-width:100%;margin-top:6px">
          <source src="${p.video}" type="video/mp4">
        </video>
      ` : ""}

      <div style="margin-top:6px">
        <button onclick="toggleLike('${p._id}')">
          👍 Like (${p.likes?.length || 0})
        </button>

        ${
          p.userId?._id === myId
            ? `<button onclick="deletePost('${p._id}')" style="color:red;margin-left:10px">
                🗑️ Delete
               </button>`
            : ""
        }
      </div>

      <div style="margin-top:6px">
        ${(p.comments || []).map(c => `
          <div style="margin-left:10px;font-size:14px">
            💬 ${c.text}
          </div>
        `).join("")}
      </div>

      <div style="margin-top:6px">
        <input
          placeholder="Write comment..."
          id="c-${p._id}"
          style="width:70%"
        />
        <button onclick="addComment('${p._id}')">Send</button>
      </div>
    `;

    feed.appendChild(div);
  });
}

/* ======================
   LIKE / UNLIKE
====================== */
async function toggleLike(postId) {
  await fetch(API + "/api/posts/" + postId + "/like", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadFeed();
}

/* ======================
   ADD COMMENT
====================== */
async function addComment(postId) {
  const input = document.getElementById("c-" + postId);
  const text = input.value.trim();
  if (!text) return;

  await fetch(API + "/api/posts/" + postId + "/comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ text })
  });

  input.value = "";
  loadFeed();
}

/* ======================
   DELETE POST (ONLY OWNER)
====================== */
async function deletePost(postId) {
  await fetch(API + "/api/posts/" + postId, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token
    }
  });

  loadFeed();
}

/* ======================
   INITIAL LOAD
====================== */
loadFeed();
