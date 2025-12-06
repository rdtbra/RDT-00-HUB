document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  const allGroups = Array.isArray(window.GROUPS) ? window.GROUPS : [];

  const titleEl = document.getElementById("coverTitle");
  const imgEl   = document.getElementById("coverImage");
  const linkEl  = document.getElementById("coverRefLink");
  const descEl  = document.getElementById("coverDescription");
  const iaList  = document.getElementById("iaList");

  if (!groupId) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    return;
  }

  const group = allGroups.find(g => g.id === groupId);

  if (!group) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    return;
  }

  // Título, imagem, link
  if (titleEl) titleEl.textContent = group.name || group.id;
  if (imgEl)   imgEl.src = group.icon || "";
  if (linkEl)  linkEl.href = group.iconHref || "#";

  // Descrição vinda de TXT (se existir)
  if (descEl) {
    const descPath = `descriptions/${groupId}.txt`;
    fetch(descPath)
      .then(r => (r.ok ? r.text() : Promise.reject()))
      .then(text => {
        descEl.textContent = (text || "").trim() || "Nenhuma descrição disponível.";
      })
      .catch(() => {
        descEl.textContent = "Nenhuma descrição disponível.";
      });
  }

  // Lista de IAs
  if (iaList && Array.isArray(group.items)) {
    iaList.innerHTML = "";
    group.items.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label} • ${item.provider}</a>`;
      iaList.appendChild(li);
    });
  }
});
