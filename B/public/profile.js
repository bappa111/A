const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

// userId URL থেকে আসবে
const userId = new URLSearchParams(location.search).get("id");

async function loadProfile() {
  const res = await fetch(API + "/api/users/profile/" + userId, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  const data = await res.json();

  // USER INFO
  document.getElementById("name").innerText = data.user.name;
  document.getElementById("email").innerText = data.user.email;
  document.getElementById("bio").innerText = data.user.bio || "";

  if (data.user.profilePic) {
    const img = document.getElementById("profilePic");
    img.src = data.user.profilePic;
    img.style.display = "block";
  }

  // POSTS
  const postsDiv = document.getElementById("posts");
  postsDiv.innerHTML = "";

  data.posts.forEach(p => {
    const div = document.createElement("div");
    div.style.border = "1px solid #ccc";
    div.style.marginBottom = "10px";
    div.style.padding = "6px";

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

loadProfile();
