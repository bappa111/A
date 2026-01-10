const API = "https://a-kisk.onrender.com";

// REGISTER
async function register() {
  await fetch(API + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: rname.value,
      email: remail.value,
      password: rpass.value
    })
  });
  alert("Registered");
}

// LOGIN
async function login() {
  const res = await fetch(API + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: lemail.value,
      password: lpass.value
    })
  });
  const data = await res.json();
  localStorage.setItem("token", data.token);
  location.href = "feed.html";
}

// CREATE POST
async function createPost() {
  await fetch(API + "/api/posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({ content: post.value })
  });
  loadPosts();
}

// LOAD POSTS
async function loadPosts() {
  const res = await fetch(API + "/api/posts");
  const posts = await res.json();
  feed.innerHTML = posts.map(p => `<p>${p.content}</p>`).join("");
}

if (location.pathname.includes("feed")) loadPosts();
