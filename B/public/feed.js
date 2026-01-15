const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

async function createPost() {
  const text = document.getElementById("postText").value.trim();
  if (!text) return alert("Write something");

  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ content: text })
  });

  document.getElementById("postText").value = "";
  loadFeed();
}

async function loadFeed() {
  const res = await fetch(API + "/api/posts", {
    headers: { Authorization: "Bearer " + token }
  });

  const posts = await res.json();
  const feed = document.getElementById("feed"); // ✅ FIX
  feed.innerHTML = "";

  posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.padding = "8px";
    div.style.marginBottom = "8px";

    div.innerHTML = `
      <b>${p.userId?.name || "User"}</b>
      <p>${p.content}</p>
      <button>👍 Like</button>
      <button>💬 Comment</button>
    `;

    feed.appendChild(div);
  });
}

loadFeed();
