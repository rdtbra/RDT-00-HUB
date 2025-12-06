document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  // GROUPS deve ter sido definido antes por um arquivo específico da categoria
  if (!window.GROUPS || !groupId || !GROUPS[groupId]) {
    const titleEl = document.getElementById("coverTitle");
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    return;
  }

  const group = GROUPS[groupId];

  // Título, imagem, link
  const titleEl = document.getElementById("coverTitle");
  const imgEl = document.getElementById("coverImage");
  const linkEl = document.getElementById("coverRefLink");

  if (titleEl) titleEl.textContent = group.name || group.id;
  if (imgEl) imgEl.src = group.icon || "";
  if (linkEl) linkEl.href = group.iconHref || "#";

  // Descrição vinda de TXT (se existir)
  const descEl = document.getElementById("coverDescription");
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
  const iaList = document.getElementById("iaList");
  if (iaList && Array.isArray(group.items)) {
    iaList.innerHTML = "";
    group.items.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label} • ${item.provider}</a>`;
      iaList.appendChild(li);
    });
  }
});
