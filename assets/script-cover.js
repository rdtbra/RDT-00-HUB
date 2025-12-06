document.addEventListener("DOMContentLoaded", () => {

  // Lê parâmetro da URL: ?group=af-01-ib6
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  if (!groupId || !AF_GROUPS[groupId]) {
    document.getElementById("coverTitle").textContent = "Grupo não encontrado";
    return;
  }

  // Obtém o grupo diretamente do AFgroups.js
  const group = AF_GROUPS[groupId];

  // Preenche dados básicos da capa
  document.getElementById("coverTitle").textContent = group.name;
  document.getElementById("coverImage").src = group.icon || "";
  document.getElementById("coverRefLink").href = group.iconHref || "#";

  // Carrega descrição do TXT correspondente
  const descPath = `descriptions/${groupId}.txt`;

  fetch(descPath)
    .then(response => {
      if (!response.ok) {
        throw new Error("Arquivo não encontrado");
      }
      return response.text();
    })
    .then(text => {
      document.getElementById("coverDescription").textContent = text.trim();
    })
    .catch(() => {
      document.getElementById("coverDescription").textContent =
        "Nenhuma descrição disponível.";
    });

  // Carrega lista das IAs
  const iaList = document.getElementById("iaList");

  group.items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label} • ${item.provider}</a>`;
    iaList.appendChild(li);
  });

});
