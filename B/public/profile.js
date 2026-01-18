postsDiv.innerHTML = "";

data.posts.forEach(p => {
  const div = document.createElement("div");
  div.style.border = "1px solid #ccc";
  div.style.padding = "8px";
  div.style.marginBottom = "10px";

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
