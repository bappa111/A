const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

async function createPost() {
  const text = document.getElementById("postText").value;
  const img = document.getElementById("postImage").files[0];
  const vid = document.getElementById("postVideo").files[0];

  // আপাতত শুধু text post
  const res = await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ text })
  });

  loadFeed();
}

async function loadFeed() {
  const res = await fetch(API + "/api/posts");
  const posts = await res.json();

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  posts.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = `
      <p>${p.text}</p>
      <button>👍 Like</button>
      <button>💬 Comment</button>
      <hr>
    `;
    feed.appendChild(div);
  });
}

loadFeed();
