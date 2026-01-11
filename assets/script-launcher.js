// script-launcher.js
// Lógica compartilhada dos launchers (EMT, DV, PRJ, Pessoal, Beyond, etc.).
// Requer variáveis globais definidas ANTES deste script:
//   const KEY = "ia-launcher-config:AlgumaCoisa";
//   const DEFAULT_GROUPS = [ ... ];
//
// (NOVO) Caso DEFAULT_GROUPS não exista, tentamos usar window.GROUPS como fallback.
// (NOVO) Implementa o botão +Grupo (#addGroup) para criar grupo inteiro via UI,
//       com opção de pré-criar a equipe padrão (M01..M05, SUP, REV).

// script-launcher.js - Versão com Sincronização Automática Capa -> Launcher
(function () {
  if (typeof KEY === "undefined") return;

  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // --- Lógica de Prioridade (Cascata) ---

  async function getGroupData(g) {
    const id = g.id;

    // Prioridade 1: LocalStorage (Override manual recente)
    const localHeader = localStorage.getItem(`${KEY}:group:${id}`);
    const localItems = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${id}`);
    
    if (localHeader && localItems) {
      return { ...JSON.parse(localHeader), items: JSON.parse(localItems) };
    }

    // Prioridade 2: FileSystem (descriptions/id.group.json e id.items.json)
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
    } catch (e) {
      console.warn(`[FS] Erro ao buscar arquivos para ${id}`);
    }

    // Prioridade 3: JS Original (Fallback)
    return g; 
  }

  // --- Exportação Modular ---

  function exportModular(g) {
    const header = { 
      id: g.id, 
      name: g.name, 
      color: g.color, 
      icon: g.icon, 
      iconHref: g.iconHref 
    };
    downloadFile(`${g.id}.group.json`, JSON.stringify(header, null, 2));

    const items = { items: g.items || [] };
    downloadFile(`${g.id}.items.json`, JSON.stringify(items, null, 2));
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  // --- Inicialização e Renderização ---

  let activeGroups = [];
  const groupsEl = document.getElementById("groups");

  async function init() {
    const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
    activeGroups = await Promise.all(originalGroups.map(g => getGroupData(g)));
    render();
  }

  function render() {
    if (!groupsEl) return;
    groupsEl.innerHTML = "";

    activeGroups.forEach((g, gi) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeft = `5px solid ${g.color || "#8b86ff"}`;
      
      // RESTAURADO: Estrutura de ícones gicon-wrap e gicon
      card.innerHTML = `
        <div class="head">
          <h2 class="chev">
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
            <button class="btn" data-act="export">Exportar Disco</button>
          </div>
        </div>
        <div class="grid" style="display:grid; gap:5px; padding:10px;">
          <small style="color:#666">ID: ${g.id} | Itens carregados: ${g.items ? g.items.length : 0}</small>
        </div>
      `;

      card.querySelector("[data-act='open-cover']").onclick = () => {
        window.open(`cover.html?group=${encodeURIComponent(g.id)}`, "_blank");
      };

      card.querySelector("[data-act='export']").onclick = () => {
        exportModular(g);
      };

      groupsEl.appendChild(card);
    });
  }

  init();
})();