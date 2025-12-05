document.addEventListener("DOMContentLoaded", () => {

  // Lê parâmetros da URL: ?group=af-01-ib6
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  // Chave usada no launcher
  const configKey = "ia-launcher-config:AI-AF-Equipes";
  const config = JSON.parse(localStorage.getItem(configKey) || "{}");

  if (!groupId || !config.groups) {
    document.getElementById("coverTitle").textContent = "Grupo não encontrado";
    return;
  }

  // Encontra o grupo
  const group = config.groups.find(g => g.id === groupId);

  if (!group) {
    document.getElementById("coverTitle").textContent = "Grupo não encontrado";
    return;
  }

  // Preenche dados básicos da capa
  document.getElementById("coverTitle").textContent = group.name;
  document.getElementById("coverImage").src = group.icon || "";
  document.getElementById("coverRefLink").href = group.iconHref || "#";

  // Carregar descrição do TXT correspondente
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

  // Carregar lista das IAs
  const iaList = document.getElementById("iaList");

  group.items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label} • ${item.provider}</a>`;
    iaList.appendChild(li);
  });

});
