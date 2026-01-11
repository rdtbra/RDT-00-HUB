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

    // Prioridade 1: LocalStorage (Override temporário)
    const localHeader = localStorage.getItem(`${KEY}:group:${id}`);
    const localItems = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${id}`);
    
    if (localHeader && localItems) {
      console.log(`[Prioridade 1] Carregando ${id} do LocalStorage`);
      return { ...JSON.parse(localHeader), items: JSON.parse(localItems) };
    }

    // Prioridade 2: FileSystem (descriptions/id.group.json e id.items.json)
    try {
      const respH = await fetch(`descriptions/${id}.group.json`);
      if (respH.ok) {
        const header = await respH.json();
        const respI = await fetch(`descriptions/${id}.items.json`);
        // Se encontrar o arquivo de itens, usa. Se não, tenta os itens do JS.
        const itemsData = respI.ok ? await respI.json() : null;
        
        if (itemsData) {
          console.log(`[Prioridade 2] Carregando ${id} do FileSystem`);
          return { ...header, items: Array.isArray(itemsData) ? itemsData : itemsData.items };
        }
      }
    } catch (e) {
      console.warn(`[FS] Falha ao tentar buscar arquivos para ${id}`);
    }

    // Prioridade 3: JS Original (Fallback)
    console.log(`[Prioridade 3] Carregando ${id} do arquivo JS Original`);
    return g; 
  }

  // --- Funções de Exportação ---

  function exportModular(g) {
    // 1. Exporta o Cabeçalho (.group.json)
    const header = { 
      id: g.id, 
      name: g.name, 
      color: g.color, 
      icon: g.icon, 
      iconHref: g.iconHref 
    };
    downloadFile(`${g.id}.group.json`, JSON.stringify(header, null, 2));

    // 2. Exporta os Itens (.items.json)
    const items = g.items || [];
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
    // Pega a lista original (aqueles 35 itens que você mencionou no JS)
    const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
    
    // Resolve a prioridade para cada um deles
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
      
      card.innerHTML = `
        <div class="head">
          <h2><span class="chip" style="background:${g.color}"></span> ${g.name}</h2>
          <div class="actions">
            <button class="btn" data-act="open-cover">Capa</button>
            <button class="btn" data-act="export">Exportar Disco</button>
          </div>
        </div>
        <div class="grid" style="display:grid; gap:5px; padding:10px;">
          <small style="color:#666">ID: ${g.id} | Itens: ${g.items ? g.items.length : 0}</small>
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