const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

async function createPost() {
  const text = document.getElementById("postText").value;

  if (!text.trim()) return;

  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ text })
  });

  document.getElementById("postText").value = "";
  loadFeed();
}

async function loadFeed() {
  const res = await fetch(API + "/api/posts", {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const posts = await res.json();
  const feed = document.getElementById("feedPosts");
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
