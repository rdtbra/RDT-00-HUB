/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js
 * Tipo: Cover Page Controller
 *
 * Função:
 * - Controla a página de capa dos grupos
 * - Carrega título, imagem, descrição e lista de recursos
 * - Gerencia abertura em massa de abas (Abrir todas)
 * - Atualiza dinamicamente o título da aba do navegador
 * - (NOVO) Editor in-page para equipes/itens do grupo:
 *   - Editar / Inserir item inteiro (M01..REV etc.)
 *   - Salvar no localStorage (override)
 *   - Exportar / Importar JSON
 *   - Limpar override (voltar para JSON/JS)
 *
 * Contexto:
 * Sistema HUB profissional e pessoal para estudos,
 * desenvolvimento, análise de código e projetos diversos,
 * integrando múltiplos provedores de LLMs.
 *
 * Dependências:
 * - window.GROUPS (Pessoalgroups.js / Estudogroups.js)
 * - script.js (configurações globais / tema)
 *
 * Persistência:
 * - localStorage (configurações globais do HUB)
 *
 * Autor: RDT-00-HUB - Equipe
 * Supervisor: ChatGPT (SUP)
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
    if (p.includes("/pessoal/")) return "Pessoal";
    if (p.includes("/profissional/")) return "Profissional";
    return "Pessoal";
  })();

  const EDITOR_STATE_KEY = `ia-launcher-config:${APP_ID}:cover-editor-state:${groupId}`;
  function setEditorState(state) {
    try { sessionStorage.setItem(EDITOR_STATE_KEY, JSON.stringify(state)); } catch {}
  }
  function getEditorState() {
    try {
      const raw = sessionStorage.getItem(EDITOR_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function clearEditorState() {
    try { sessionStorage.removeItem(EDITOR_STATE_KEY); } catch {}
  }

  function loadGroupsForCover() {
    try {
      if (typeof KEY !== "undefined" && typeof KEY === "string" && KEY.trim()) {
        const raw = localStorage.getItem(KEY.trim());
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    try {
      const k = `ia-launcher-config:${APP_ID}`;
      const raw = localStorage.getItem(k);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}

    return Array.isArray(window.GROUPS) ? window.GROUPS : [];
  }

  const allGroups = loadGroupsForCover();
  const group = allGroups.find(g => g.id === groupId);

  const titleEl = document.getElementById("coverTitle");
  const imgEl   = document.getElementById("coverImage");
  const linkEl  = document.getElementById("coverRefLink");
  const descEl  = document.getElementById("coverDescription");
  const iaList  = document.getElementById("iaList");

  if (!groupId || !group) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    return;
  }

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return null;
    return items
      .filter(it => it && typeof it === "object")
      .map(it => ({
        code: (it.code ?? "").toString().trim(),
        label: (it.label ?? "").toString().trim(),
        provider: (it.provider ?? "").toString().trim(),
        url: (it.url ?? "").toString().trim(),
        checked: (typeof it.checked === "boolean") ? it.checked : true,
        img: (it.img ?? "").toString().trim(),
      }))
      .filter(it => it.url);
  }

  function loadItemsFromLocalStorage() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    return raw ? normalizeItems(safeJsonParse(raw)) : null;
  }

  async function loadItemsFromJsonFile() {
    const path = `descriptions/${groupId}.items.json`;
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) return null;
      const data = await r.json();
      return normalizeItems(Array.isArray(data) ? data : data?.items);
    } catch { return null; }
  }

  function renderIAList(items) {
    if (!iaList) return;
    iaList.innerHTML = "";
    if (!Array.isArray(items) || !items.length) {
      iaList.innerHTML = "<li>Nenhum recurso configurado.</li>";
      return;
    }
    items.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.code} - ${item.label} • ${item.provider}</a>`;
      iaList.appendChild(li);
    });
  }

  function bindOpenAllButton(items) {
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;
    const newBtn = openAllBtn.cloneNode(true);
    openAllBtn.replaceWith(newBtn);
    newBtn.addEventListener("click", () => {
      const urls = (items || []).filter(it => it.url && it.checked !== false).map(it => it.url);
      urls.forEach(url => window.open(url, "_blank", "noopener,noreferrer"));
    });
  }

  if (titleEl) titleEl.textContent = group.name || group.id;
  document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;
  if (imgEl) imgEl.src = group.icon || "";
  if (linkEl) linkEl.href = group.iconHref || "#";

  if (descEl) {
    fetch(`descriptions/${groupId}.txt`)
      .then(r => r.ok ? r.text() : "Nenhuma descrição.")
      .then(t => descEl.textContent = t.trim())
      .catch(() => descEl.textContent = "Nenhuma descrição.");
  }

  // --- Helpers de UI ---
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") el.className = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (!c) return;
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  let activeItems = [];

function openEditorModal() {
    setEditorState({ open: true, draft: getEditorState()?.draft || null });

    const overlay = createEl("div", {
      id: "teamEditorOverlay",
      style: "position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;"
    });

    const modal = createEl("div", {
      style: "width:min(920px, 96vw);max-height:90vh;overflow:auto;background:var(--card-bg, #111827);color:var(--text, #e5e7eb);border:1px solid rgba(255,255,255,.12);border-radius:12px;box-shadow:0 16px 50px rgba(0,0,0,.5);padding:20px;display:flex;flex-direction:column;gap:15px;"
    });

    const header = createEl("div", { style: "display:flex;align-items:center;justify-content:space-between;" }, [
      createEl("div", {}, [
        createEl("div", { style: "font-weight:700;font-size:1.2rem;" }, `Editor de Equipe: ${group.name || group.id}`),
        createEl("div", { style: "opacity:.6;font-size:0.8rem;" }, `ID do Grupo: ${groupId}`)
      ]),
      createEl("button", { type: "button", class: "btn", onclick: () => { clearEditorState(); overlay.remove(); } }, "✖")
    ]);

    // --- Bloco de Inserção Automática ---
    const insertBox = createEl("div", { style: "background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;" });
    
    const inCode = createEl("input", { placeholder: "Cód (M01)", style: "flex:1;min-width:60px;padding:8px;background:#000;border:1px solid #444;color:#fff;border-radius:5px;" });
    const inLabel = createEl("input", { placeholder: "Label (ChatGPT)", style: "flex:2;min-width:120px;padding:8px;background:#000;border:1px solid #444;color:#fff;border-radius:5px;" });
    const inProv = createEl("input", { placeholder: "Provider", style: "flex:1;min-width:100px;padding:8px;background:#000;border:1px solid #444;color:#fff;border-radius:5px;" });
    const inUrl = createEl("input", { placeholder: "URL (https://...)", style: "flex:3;min-width:180px;padding:8px;background:#000;border:1px solid #444;color:#fff;border-radius:5px;" });
    
    const btnInsert = createEl("button", { type: "button", class: "btn", style: "background:var(--accent, #8b86ff);", onclick: () => {
      if (!inUrl.value) return alert("A URL é obrigatória!");
      const newItem = {
        code: inCode.value || "M00",
        label: inLabel.value || "Novo Item",
        provider: inProv.value || "",
        url: inUrl.value,
        checked: true
      };
      const currentItems = safeJsonParse(textarea.value) || [];
      currentItems.push(newItem);
      textarea.value = JSON.stringify(currentItems, null, 2);
      inUrl.value = ""; inCode.value = ""; inLabel.value = ""; // Limpa
    }}, "➕ Inserir Item");

    insertBox.append(inCode, inLabel, inProv, inUrl, btnInsert);

    // --- Área do JSON ---
    const textarea = createEl("textarea", {
      style: "width:100%;min-height:250px;font-family:monospace;font-size:12px;background:#0a0a0a;color:#8b86ff;border:1px solid #333;border-radius:8px;padding:12px;box-sizing:border-box;resize:vertical;"
    });
    textarea.value = JSON.stringify(activeItems, null, 2);

    // --- Botões de Ação Inferiores ---
    const footer = createEl("div", { style: "display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;" });
    
    const leftActions = createEl("div", { style: "display:flex;gap:8px;" });
    const btnImport = createEl("button", { type: "button", class: "btn", onclick: () => {
      const fin = createEl("input", { type: "file", accept: ".json" });
      fin.onchange = e => {
        const reader = new FileReader();
        reader.onload = () => {
          const data = safeJsonParse(reader.result);
          textarea.value = JSON.stringify(Array.isArray(data) ? data : data?.items || [], null, 2);
        };
        reader.readAsText(e.target.files[0]);
      };
      fin.click();
    }}, "⬆️ Importar JSON");

    const btnExport = createEl("button", { type: "button", class: "btn", onclick: () => {
      const content = JSON.stringify({ items: safeJsonParse(textarea.value) }, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${groupId}.items.json`;
      a.click();
    }}, "⬇️ Exportar .items.json");

    leftActions.append(btnImport, btnExport);

    const rightActions = createEl("div", { style: "display:flex;gap:8px;" });
    const btnCancel = createEl("button", { type: "button", class: "btn", onclick: () => overlay.remove() }, "Cancelar");
    const btnSave = createEl("button", { type: "button", class: "btn", style: "background:#22c55e;color:#fff;", onclick: () => {
      const norm = normalizeItems(safeJsonParse(textarea.value));
      if (norm) {
        localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(norm));
        activeItems = norm;
        renderIAList(activeItems);
        bindOpenAllButton(activeItems);
        overlay.remove();
        alert("Configuração salva no navegador!");
      } else { alert("Erro: JSON inválido."); }
    }}, "💾 Salvar Local");

    rightActions.append(btnCancel, btnSave);
    footer.append(leftActions, rightActions);

    modal.append(header, insertBox, textarea, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }
  
  function ensureEditorButton() {
    if (document.getElementById("editTeamBtn")) return;
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;

    const editBtn = createEl("button", {
      id: "editTeamBtn",
      class: openAllBtn.className,
      style: "margin-top:8px;",
      onclick: () => openEditorModal()
    }, "✏️ Editar equipe (itens)");

    openAllBtn.insertAdjacentElement("afterend", editBtn);
  }

  (async () => {
    activeItems = loadItemsFromLocalStorage() || await loadItemsFromJsonFile() || normalizeItems(group.items) || [];
    renderIAList(activeItems);
    bindOpenAllButton(activeItems);
    ensureEditorButton();

    const st = getEditorState();
    if (st && st.open) openEditorModal();
  })();
});