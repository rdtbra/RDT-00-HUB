/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js (VERSÃO COMPLETA E CORRIGIDA)
 * ============================================================
 */

(function () {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  if (!groupId) {
    console.error("[cover] Nenhum group ID na URL.");
    return;
  }

  // --- 1. Sincronização de Identidade (Busca o que você editou no Launcher) ---
  function getGroupHeader() {
    // Tenta primeiro o LocalStorage (onde o Launcher salva as edições de Nome/Cor)
    const localHeader = localStorage.getItem(`ia-launcher-config:Estudos:group:${groupId}`);
    if (localHeader) return JSON.parse(localHeader);

    // Fallback para o arquivo JS original se não houver edição manual
    if (window.GROUPS && Array.isArray(window.GROUPS)) {
      return window.GROUPS.find(g => g.id === groupId);
    }
    return null;
  }

  const group = getGroupHeader();
  if (!group) {
    console.warn("[cover] Grupo não encontrado:", groupId);
    return;
  }

  // Chave de itens rigorosamente igual à do Launcher
  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  // Aplicar Identidade Visual
  document.title = group.name || "Capa";
  const titleEl = document.getElementById("groupTitle");
  if (titleEl) {
    titleEl.textContent = group.name;
    titleEl.style.color = group.color || "#8b86ff";
  }
  const iconEl = document.getElementById("groupIcon");
  if (iconEl && group.icon) iconEl.src = group.icon;

  // --- 2. Lógica de Carregamento de Itens ---
  function loadItems() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Garante que retorna uma array, idependente se veio do Launcher ou da Capa
        return Array.isArray(parsed) ? parsed : (parsed.items || []);
      } catch (e) { return group.items || []; }
    }
    return group.items || [];
  }

  function saveItems(items) {
    // Salva na chave que o Launcher também monitora
    localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(items));
  }

  function renderIAList(items) {
    const container = document.getElementById("iaList");
    if (!container) return;
    container.innerHTML = "";

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "ia-card";
      card.innerHTML = `
        <div class="ia-info">
          <span class="ia-code">${item.code || ""}</span>
          <span class="ia-label">${item.label || "Sem nome"}</span>
          ${item.provider ? `<span class="ia-provider">${item.provider}</span>` : ""}
        </div>
        <a href="${item.url || "#"}" target="_blank" class="ia-link">Acessar</a>
      `;
      container.appendChild(card);
    });
  }

  // --- 3. EDITOR MODAL (Mantido na íntegra conforme seu original) ---
  function openEditorModal() {
    const items = loadItems();
    const overlay = document.createElement("div");
    overlay.id = "editorOverlay";
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", background: "rgba(0,0,0,0.85)",
      zIndex: "10000", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      background: "#1e1e2e", padding: "25px", borderRadius: "12px",
      width: "100%", maxWidth: "900px", maxHeight: "90vh", overflowY: "auto",
      border: "1px solid rgba(255,255,255,0.1)", color: "#fff"
    });

    modal.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="margin:0">🛠️ Editor de Equipe - ${group.name}</h2>
        <button id="closeEditor" class="btn" style="background:#ff5f56">Fechar</button>
      </div>
      <div id="editorRows" style="display:flex; flex-direction:column; gap:10px;"></div>
      <div style="margin-top:25px; display:flex; gap:10px; justify-content:space-between;">
        <button id="addItem" class="btn" style="background:#444">+ Adicionar IA</button>
        <button id="saveEditor" class="btn" style="background:#8b86ff; font-weight:bold; padding:10px 30px;">💾 Salvar Alterações</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const rowsCont = document.getElementById("editorRows");

    function createRow(item) {
      const row = document.createElement("div");
      row.style = "display:grid; grid-template-columns: 80px 1fr 1fr 2fr 50px; gap:10px; align-items:center; background:#111; padding:10px; border-radius:8px;";
      row.innerHTML = `
        <input type="text" value="${item.code || ""}" placeholder="Cód" data-key="code" style="width:100%; background:#222; border:1px solid #444; color:#fff; padding:5px;">
        <input type="text" value="${item.label || ""}" placeholder="Nome" data-key="label" style="width:100%; background:#222; border:1px solid #444; color:#fff; padding:5px;">
        <input type="text" value="${item.provider || ""}" placeholder="Provider" data-key="provider" style="width:100%; background:#222; border:1px solid #444; color:#fff; padding:5px;">
        <input type="text" value="${item.url || ""}" placeholder="URL" data-key="url" style="width:100%; background:#222; border:1px solid #444; color:#fff; padding:5px;">
        <button class="btn del-row" style="background:#ff5f56; padding:5px;">&times;</button>
      `;
      row.querySelector(".del-row").onclick = () => row.remove();
      rowsCont.appendChild(row);
    }

    items.forEach(it => createRow(it));

    document.getElementById("addItem").onclick = () => createRow({code:"", label:"", provider:"", url:""});

    document.getElementById("saveEditor").onclick = () => {
      const newItems = Array.from(rowsCont.children).map(row => {
        const inputs = row.querySelectorAll("input");
        return {
          code: inputs[0].value,
          label: inputs[1].value,
          provider: inputs[2].value,
          url: inputs[3].value,
          checked: true
        };
      });
      saveItems(newItems);
      overlay.remove();
      renderIAList(newItems);
      alert("Alterações salvas! O Launcher e a Capa estão sincronizados.");
    };

    document.getElementById("closeEditor").onclick = () => overlay.remove();
  }

  // --- 4. Inicialização e Eventos ---
  function init() {
    const items = loadItems();
    renderIAList(items);

    // Botão de Abrir Tudo da Capa
    const openAllBtn = document.getElementById("openAllCover");
    if (openAllBtn) {
      openAllBtn.onclick = () => {
        items.forEach(it => { if(it.url && it.url !== "#") window.open(it.url, "_blank"); });
      };
    }

    // Botão de Edição (Apenas via clique, nunca automático)
    const editBtn = document.getElementById("editGroupBtn");
    if (editBtn) editBtn.onclick = openEditorModal;
  }

  init();
})();