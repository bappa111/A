const API = "https://a-kisk.onrender.com";
const token = localStorage.getItem("token");

// 🔐 userId URL থেকে আসবে (?id=xxxx)
const userId = new URLSearchParams(window.location.search).get("id");

// ⛔ userId না থাকলে কিছুই করবে না
if (!userId) {
  alert("User id missing");
  throw new Error("User id missing in URL");
}

async function loadProfile() {
  try {
    const res = await fetch(API + "/api/users/profile/" + userId, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      alert("Failed to load profile");
      return;
    }

    const data = await res.json();

    // ===== USER INFO =====
    const nameEl = document.getElementById("name");
    const emailEl = document.getElementById("email");
    const bioEl = document.getElementById("bio");
    const imgEl = document.getElementById("profilePic");

    if (nameEl) nameEl.innerText = data.user.name || "";
    if (emailEl) emailEl.innerText = data.user.email || "";
    if (bioEl) bioEl.innerText = data.user.bio || "";

    if (imgEl && data.user.profilePic) {
      imgEl.src = data.user.profilePic;
      imgEl.style.display = "block";
    }

    // ===== POSTS =====
    const postsDiv = document.getElementById("posts");
    if (!postsDiv) return;

    postsDiv.innerHTML = "";

    data.posts.forEach(p => {
      const div = document.createElement("div");
      div.style.border = "1px solid #ccc";
      div.style.marginBottom = "10px";
      div.style.padding = "6px";

      div.innerHTML = `
        <p>${p.content || ""}</p>

        ${p.image ? `
          <img src="${p.image}" style="max-width:100%;margin-top:6px">
        ` : ""}

        ${p.video ? `
          <video controls style="max-width:100%;margin-top:6px">
            <source src="${p.video}" type="video/mp4">
          </video>
        ` : ""}
      `;

      postsDiv.appendChild(div);
    });

  } catch (err) {
    console.error("PROFILE LOAD ERROR:", err);
    alert("Something went wrong loading profile");
  }
}

// 🚀 INIT
loadProfile();
