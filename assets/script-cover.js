// script-cover.js
// Capa de grupo para categoria ESTUDOS (AI-EMT-Equipes)

(function () {
  // -------------------------------------------------
  // 1. Ler parâmetro ?group=emt-01-es
  // -------------------------------------------------
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  if (!groupId) {
    console.error("[cover] Nenhum parâmetro ?group= informado.");
    return;
  }

  // -------------------------------------------------
  // 2. Carregar grupos do localStorage
  //    usando a mesma KEY do launcher
  // -------------------------------------------------
  const STORAGE_KEY = "ia-launcher-config:AI-EMT-Equipes";

  function loadGroupsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("[cover] Falha ao ler storage:", e);
      return [];
    }
  }

  let groups = loadGroupsFromStorage();

  // fallback opcional: se DEFAULT_GROUPS existir, usa como base
  if ((!groups || !groups.length) && typeof DEFAULT_GROUPS !== "undefined") {
    groups = DEFAULT_GROUPS;
  }

  if (!groups || !groups.length) {
    console.error("[cover] Nenhum grupo encontrado (storage e DEFAULT_GROUPS vazios).");
    return;
  }

  const group = groups.find(g => g.id === groupId);

  if (!group) {
    console.error("[cover] Grupo não encontrado:", groupId);
    return;
  }

  // -------------------------------------------------
  // 3. Referências de DOM
  // -------------------------------------------------
  const elTitle = document.getElementById("coverTitle");
  const elImage = document.getElementById("coverImage");
  const elRefLink = document.getElementById("coverRefLink");
  const elDesc = document.getElementById("coverDescription");
  const elIaList = document.getElementById("iaList");

  if (!elTitle || !elImage || !elRefLink || !elDesc || !elIaList) {
    console.error("[cover] Elementos da capa não encontrados.");
    return;
  }

  // -------------------------------------------------
  // 4. Preencher título
  // -------------------------------------------------
  elTitle.textContent = group.name || ("Grupo " + groupId.toUpperCase());

  // -------------------------------------------------
  // 5. Preencher imagem (usa 'icon' do grupo)
  // -------------------------------------------------
  if (group.icon) {
    // caminho relativo continua válido em estudos.html
    elImage.src = group.icon;
    elImage.style.display = "";
  } else {
    elImage.style.display = "none";
  }

  // -------------------------------------------------
  // 6. Link para material de referência (usa iconHref)
  // -------------------------------------------------
  if (group.iconHref && group.iconHref !== "#") {
    elRefLink.href = group.iconHref;
    elRefLink.style.display = "";
  } else {
    elRefLink.style.display = "none";
  }

  // -------------------------------------------------
  // 7. Carregar descrição do arquivo TXT
  //    categorias/estudos/descriptions/<groupId>.txt
  // -------------------------------------------------
  const descUrl = "descriptions/" + encodeURIComponent(groupId) + ".txt";

  fetch(descUrl)
    .then(r => {
      if (!r.ok) throw new Error("TXT não encontrado");
      return r.text();
    })
    .then(text => {
      const clean = (text || "").trim();
      elDesc.textContent = clean || "(Nenhuma descrição disponível.)";
    })
    .catch(err => {
      console.warn("[cover] Erro ao carregar descrição:", err);
      elDesc.textContent = "(Nenhuma descrição disponível.)";
    });

  // -------------------------------------------------
  // 8. Montar lista de IAs do grupo
  // -------------------------------------------------
  elIaList.innerHTML = "";

  (group.items || []).forEach(item => {
    if (!item || !item.url) return;

    const li = document.createElement("li");

    const pieces = [];
    if (item.code) pieces.push(item.code);
    if (item.label) pieces.push(item.label);
    if (item.provider) pieces.push(item.provider);

    const text = pieces.join(" • ") || item.url;

    const a = document.createElement("a");
    a.href = item.url;
    a.textContent = text;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    li.appendChild(a);
    elIaList.appendChild(li);
  });

})();
