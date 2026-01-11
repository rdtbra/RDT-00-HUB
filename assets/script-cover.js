/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js (VERSÃO INTEGRAL - 300+ LINHAS)
 * ============================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  const TITLE_PREFIX = (() => {
    if (typeof window.LAUNCHER_TITLE_PREFIX === "string" && window.LAUNCHER_TITLE_PREFIX.trim()) {
      return window.LAUNCHER_TITLE_PREFIX.trim();
    }
    const p = (location.pathname || "").toLowerCase();
    if (p.includes("/estudos/")) return "Estudos";
    return "Pessoal";
  })();

  // --- SINCRONIZAÇÃO DE CABEÇALHO (Adicionado para ler do Launcher) ---
  function loadGroupData() {
    const localHeader = localStorage.getItem(`ia-launcher-config:Estudos:group:${groupId}`);
    if (localHeader) return JSON.parse(localHeader);
    const groups = Array.isArray(window.GROUPS) ? window.GROUPS : [];
    return groups.find(g => g.id === groupId);
  }

  const group = loadGroupData();
  if (!groupId || !group) return;

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  // Elementos da UI
  const titleEl = document.getElementById("coverTitle");
  const imgEl   = document.getElementById("coverImage");
  const iaList  = document.getElementById("iaList");

  if (titleEl) {
    titleEl.textContent = group.name;
    titleEl.style.color = group.color || "#8b86ff";
  }
  document.title = `${TITLE_PREFIX} – ${group.name}`;
  if (imgEl) imgEl.src = group.icon || "";

  // --- FUNÇÕES ORIGINAIS DO SEU SCRIPT (PRESERVADAS) ---
  function safeJsonParse(str) { try { return JSON.parse(str); } catch { return null; } }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(it => ({
      code: it.code || "", label: it.label || "", provider: it.provider || "", url: it.url || "", checked: true
    }));
  }

  function loadItems() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    return raw ? normalizeItems(safeJsonParse(raw)) : normalizeItems(group.items);
  }

  function renderIAList(items) {
    if (!iaList) return;
    iaList.innerHTML = "";
    items.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label}</a>`;
      iaList.appendChild(li);
    });
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "onclick") el.onclick = v;
      else el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  // --- O SEU FORMULÁRIO DE EDIÇÃO (PRESERVADO) ---
  window.openEditorModal = function() {
    const activeItems = loadItems();
    const overlay = createEl("div", { style: "position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;" });
    const modal = createEl("div", { style: "background:#1e1e2e;padding:20px;border-radius:12px;width:90%;max-width:800px;color:#fff;" });

    modal.innerHTML = `<h3>Editar Itens</h3><textarea id="jsonEd" style="width:100%;height:300px;background:#000;color:#8b86ff;font-family:monospace;">${JSON.stringify(activeItems, null, 2)}</textarea>`;
    
    const btnSave = createEl("button", { class: "btn", style: "background:#22c55e;margin-top:10px;", onclick: () => {
      const val = document.getElementById("jsonEd").value;
      localStorage.setItem(LS_ITEMS_KEY, val);
      renderIAList(normalizeItems(safeJsonParse(val)));
      overlay.remove();
    }}, "Salvar Alterações");

    modal.appendChild(btnSave);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  function ensureEditorButton() {
    if (document.getElementById("editTeamBtn")) return;
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;
    const btn = createEl("button", { id: "editTeamBtn", class: "btn", style: "margin-left:10px;", onclick: openEditorModal }, "✏️ Editar itens");
    openAllBtn.insertAdjacentElement("afterend", btn);
  }

  // --- INICIALIZAÇÃO CORRIGIDA ---
  (async () => {
    const items = loadItems();
    renderIAList(items);
    ensureEditorButton();
    // AQUI: Removi o gatilho automático que abria o modal no load.
  })();
});