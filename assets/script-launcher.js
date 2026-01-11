/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-launcher.js
 * Função: Orquestrador Modular com Exportação Geral e Segurança
 * ============================================================
 */

(function () {
  if (typeof KEY === "undefined") return;

  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // --- Lógica de Prioridade (Cascata) ---

  async function getGroupData(g) {
    const id = g.id;

    // 1. LocalStorage
    const localHeader = localStorage.getItem(`${KEY}:group:${id}`);
    const localItems = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${id}`);
    if (localHeader && localItems) {
      return { ...JSON.parse(localHeader), items: JSON.parse(localItems) };
    }

    // 2. FileSystem
    try {
      const respH = await fetch(`descriptions/${id}.group.json`);
      if (respH.ok) {
        const header = await respH.json();
        const respI = await fetch(`descriptions/${id}.items.json`);
        const itemsData = respI.ok ? await respI.json() : null;
        return { 
          ...header, 
          items: itemsData ? (Array.isArray(itemsData) ? itemsData : itemsData.items) : (g.items || [])
        };
      }
    } catch (e) {}

    // 3. JS Original
    return g; 
  }

  // --- Funções de Exportação ---

  function downloadFile(filename, content, type = "application/json") {
    const blob = new Blob([content], { type: type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // --- Inicialização e Renderização ---

  let activeGroups = [];
  const groupsEl = document.getElementById("groups");
  const exportAllBtn = document.getElementById("exportAll"); // Novo botão no HTML

  async function init() {
    const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
    activeGroups = await Promise.all(originalGroups.map(g => getGroupData(g)));
    render();
    setupGlobalActions();
  }

  function setupGlobalActions() {
    if (exportAllBtn) {
      exportAllBtn.onclick = () => {
        // Gera o conteúdo compatível com seus arquivos .js originais
        const content = `/** Backup Gerado pelo HUB **/\nconst GROUPS = ${JSON.stringify(activeGroups, null, 2)};`;
        downloadFile("meus-estudos-groups.js", content, "text/javascript");
        alert("Arquivo 'meus-estudos-groups.js' gerado com sucesso!");
      };
    }
  }

  function render() {
    if (!groupsEl) return;
    groupsEl.innerHTML = "";

    activeGroups.forEach((g, gi) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeft = `5px solid ${g.color || "#8b86ff"}`;
      
      card.innerHTML = `
        <div class="head">
          <h2 class="chev" style="cursor:pointer" data-act="toggle">
            <span class="gicon-wrap">
              <a href="${g.iconHref || "#"}" target="_blank">
                <img class="gicon" src="${g.icon || ""}" alt="ícone" onerror="this.style.display='none'">
              </a>
            </span>
            <span class="chip" style="background:${g.color}"></span> 
            ${g.name}
          </h2>
          <div class="actions">
            <button class="btn" data-act="open-cover">Capa</button>
            <button class="btn" data-act="export-disco">Exportar Disco</button>
          </div>
        </div>
        <div class="grid" data-role="grid" style="display:${g.collapsed ? "none" : "grid"}; gap:5px; padding:10px;">
          </div>
      `;

      const grid = card.querySelector("[data-role='grid']");
      (g.items || []).forEach((item) => {
        const row = document.createElement("div");
        row.className = "item";
        row.style = "display: flex; align-items: center; gap: 10px; margin-bottom: 4px;";
        row.innerHTML = `
          <div class="left" style="display:flex; align-items:center; gap:8px; flex: 1;">
            <input type="checkbox" ${item.checked !== false ? "checked" : ""}>
            <div class="composite" style="font-size:12px;">${item.code} | ${item.label}</div>
          </div>
          <div class="urlbox" style="flex: 2;">
            <input class="url" type="text" value="${item.url || ""}" style="width:100%; padding:2px 5px; background:#111; color:#ccc; border:1px solid #333;">
          </div>
          <a class="btn" href="${item.url || "#"}" target="_blank" style="font-size:11px;">Abrir</a>
        `;
        grid.appendChild(row);
      });

      // Ação da Capa
      card.querySelector("[data-act='open-cover']").onclick = () => {
        const coverPage = (typeof GROUP_COVER_PAGE !== "undefined") ? GROUP_COVER_PAGE : "index.html";
        window.open(`${coverPage}?group=${encodeURIComponent(g.id)}`, "_blank");
      };

      // Exportação individual (Modular)
      card.querySelector("[data-act='export-disco']").onclick = () => {
        const header = { id: g.id, name: g.name, color: g.color, icon: g.icon, iconHref: g.iconHref };
        downloadFile(`${g.id}.group.json`, JSON.stringify(header, null, 2));
        downloadFile(`${g.id}.items.json`, JSON.stringify({ items: g.items || [] }, null, 2));
      };

      // Toggle do Grid
      card.querySelector("[data-act='toggle']").onclick = () => {
        g.collapsed = !g.collapsed;
        grid.style.display = g.collapsed ? "none" : "grid";
      };

      groupsEl.appendChild(card);
    });
  }

  init();
})();