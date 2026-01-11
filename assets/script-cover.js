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


// ============================================================
// 🔒 Modal FIXO: bloqueia remoção acidental do editor (teamEditorOverlay)
// - O modal só fecha quando você clicar em ✖ Fechar ou Limpar override.
// - Isso evita sumir por cliques fora, foco entre janelas, extensões, etc.
// ============================================================
(function lockTeamEditorOverlayRemovalOnce(){
  if (window.__TEAM_EDITOR_OVERLAY_LOCK_INSTALLED__) return;
  window.__TEAM_EDITOR_OVERLAY_LOCK_INSTALLED__ = true;

  const origRemove = Element.prototype.remove;
  Element.prototype.remove = function () {
    if (this && this.id === "teamEditorOverlay" && this.dataset && this.dataset.locked === "1") {
      return; // Bloqueado
    }
    return origRemove.apply(this, arguments);
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  // ✅ Ajustáveis sem mexer no HTML:
  // - Se você definir window.LAUNCHER_APP_ID em algum lugar (ex.: script.js), ele será usado.
  // - Caso contrário, cai no default abaixo.
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // Prefixo do título da aba (ex.: "Pessoal", "Estudos", "Profissional").
  // Se não for definido, tenta inferir pelo path; fallback para "Pessoal".
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

  function loadGroupsForCover() {
    // 1) Se o launcher definiu KEY global, usamos ele (mesma chave do launcher).
    try {
      if (typeof KEY !== "undefined" && typeof KEY === "string" && KEY.trim()) {
        const raw = localStorage.getItem(KEY.trim());
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("[COVER] Falha ao ler grupos via KEY do launcher.", e);
    }

    // 2) Fallback: padrão por APP_ID (caso você prefira não expor KEY na capa)
    try {
      const k = `ia-launcher-config:${APP_ID}`;
      const raw = localStorage.getItem(k);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("[COVER] Falha ao ler grupos via APP_ID.", e);
    }

    // 3) Fallback final: grupos do JS (window.GROUPS)
    return Array.isArray(window.GROUPS) ? window.GROUPS : [];
  }

  const allGroups = loadGroupsForCover();

  const titleEl = document.getElementById("coverTitle");
  const imgEl   = document.getElementById("coverImage");
  const linkEl  = document.getElementById("coverRefLink");
  const descEl  = document.getElementById("coverDescription");
  const iaList  = document.getElementById("iaList");

  if (!groupId) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    document.title = `Grupo não encontrado – ${TITLE_PREFIX}`;
    return;
  }

  const group = allGroups.find(g => g.id === groupId);

  if (!group) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    document.title = `Grupo não encontrado – ${TITLE_PREFIX}`;
    return;
  }

  // =========================================
  //  Helpers (Option 3):
  //  1) localStorage override
  //  2) descriptions/<groupId>.items.json
  //  3) fallback: group.items (JS)
  // =========================================

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return null;

    // Mantém apenas estrutura mínima válida, sem quebrar caso falte campo.
    const norm = items
      .filter(it => it && typeof it === "object")
      .map(it => ({
        code: (it.code ?? "").toString().trim(),
        label: (it.label ?? "").toString().trim(),
        provider: (it.provider ?? "").toString().trim(),
        url: (it.url ?? "").toString().trim(),
        checked: (typeof it.checked === "boolean") ? it.checked : true,
        img: (it.img ?? "").toString().trim(),
      }))
      .filter(it => it.url); // só itens que tenham URL

    return norm;
  }

  function loadItemsFromLocalStorage() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse(raw);
    const norm = normalizeItems(parsed);
    return norm;
  }

  async function loadItemsFromJsonFile() {
    const path = `descriptions/${groupId}.items.json`;
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) return null;

      const data = await r.json();

      // Aceita dois formatos:
      // 1) { "items": [ ... ] }
      // 2) [ ... ]
      const candidate = Array.isArray(data) ? data : data?.items;
      const norm = normalizeItems(candidate);
      return norm;
    } catch {
      return null;
    }
  }

  function renderIAList(items) {
    if (!iaList) return;

    iaList.innerHTML = "";

    if (!Array.isArray(items) || !items.length) {
      const li = document.createElement("li");
      li.textContent = "Nenhum recurso configurado para este grupo.";
      iaList.appendChild(li);
      return;
    }

    items.forEach(item => {
      const li = document.createElement("li");
      const safeUrl = item.url.replace(/"/g, "&quot;");
      const safeText = `${item.code} - ${item.label} • ${item.provider}`;
      li.innerHTML = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      iaList.appendChild(li);
    });
  }

  function bindOpenAllButton(items) {
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;

    // Remove handlers anteriores (caso re-render em algum futuro)
    openAllBtn.replaceWith(openAllBtn.cloneNode(true));
    const newBtn = document.getElementById("openAllCover");
    if (!newBtn) return;

    newBtn.addEventListener("click", () => {
      document.title = `Abrindo recursos – ${group.name || group.id}`;

      const urls = (Array.isArray(items) ? items : [])
        // por padrão, abre os "checked". Se não existir checked, normalizeItems define true.
        .filter(it => it && it.url && it.checked !== false)
        .map(it => it.url);

      if (!urls.length) {
        alert("Nenhuma URL configurada para este grupo.");
        document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;
        return;
      }

      urls.forEach(url => {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("[COVER] Erro ao abrir URL:", url, e);
        }
      });

      setTimeout(() => {
        document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;
      }, 500);
    });
  }

  // 🏷️ Título, imagem, link (metadados do grupo)
  if (titleEl) titleEl.textContent = group.name || group.id;
  document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;

  if (imgEl)  imgEl.src = group.icon || "";
  if (linkEl) linkEl.href = group.iconHref || "#";

  // 📄 Descrição vinda de TXT (se existir)
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

  // =========================================
  //  Editor UI (injetado via JS; sem mudar HTML)
  // =========================================

  let activeItems = []; // fonte atual (após resolver LS/JSON/JS)

  function downloadTextFile(filename, content, mime = "application/json;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") el.className = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function ensureEditorButton() {
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;

    // Evita duplicar
    if (document.getElementById("editTeamBtn")) return;

    const editBtn = createEl("button", {
      id: "editTeamBtn",
      class: openAllBtn.className || "btn cover-open-all",
      type: "button",
      style: "margin-top:8px;",
    }, "✏️ Editar equipe (itens)");

    // Insere logo após o botão "Abrir todas as abas"
    openAllBtn.insertAdjacentElement("afterend", editBtn);

    editBtn.addEventListener("click", () => openEditorModal());
  }

  function openEditorModal() {
// Overlay
    const overlay = createEl("div", {
      id: "teamEditorOverlay",
      style: [
        "position:fixed",
        "inset:0",
        "background:rgba(0,0,0,.6)",
        "z-index:9999",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:16px",
      ].join(";")
    });


    // 🔒 trava o modal (só fecha via botões explícitos)
    overlay.dataset.locked = "1";

    // Modal
    const modal = createEl("div", {
      style: [
        "width:min(920px, 96vw)",
        "max-height:90vh",
        "overflow:auto",
        "background:var(--card-bg, #111827)",
        "color:var(--text, #e5e7eb)",
        "border:1px solid rgba(255,255,255,.12)",
        "border-radius:12px",
        "box-shadow:0 16px 50px rgba(0,0,0,.5)",
        "padding:14px",
      ].join(";")
    });

    

    // Evita que interações dentro do modal "vazem" para o overlay
    modal.addEventListener("mousedown", (e) => e.stopPropagation(), true);
    modal.addEventListener("click", (e) => e.stopPropagation(), true);
    modal.addEventListener("contextmenu", (e) => e.stopPropagation(), true);
const header = createEl("div", { style: "display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:10px;" }, [
      createEl("div", {}, [
        createEl("div", { style: "font-weight:700;font-size:16px;" }, `Editor de equipe — ${group.name || group.id}`),
        createEl("div", { style: "opacity:.8;font-size:12px;margin-top:2px;" },
          `Chave: ${LS_ITEMS_KEY}`
        ),
      ]),
      createEl("button", { type: "button", class: "btn", style: "padding:8px 10px;", onclick: () => { overlay.dataset.locked = "0"; overlay.remove(); } }, "✖ Fechar")
    ]);

    // Área de ações
    const actions = createEl("div", { style: "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;" });

    const btnSave = createEl("button", { type: "button", class: "btn" }, "💾 Salvar (local)");
    const btnExport = createEl("button", { type: "button", class: "btn" }, "⬇️ Exportar .items.json");
    const btnImport = createEl("button", { type: "button", class: "btn" }, "⬆️ Importar .items.json");
    const btnClear = createEl("button", { type: "button", class: "btn" }, "♻️ Limpar override (local)");
    const btnReload = createEl("button", { type: "button", class: "btn" }, "🔄 Recarregar do HUB");

    actions.append(btnSave, btnExport, btnImport, btnClear, btnReload);

    // Import file input (hidden)
    const fileInput = createEl("input", { type: "file", accept: "application/json,.json", style: "display:none" });
    btnImport.addEventListener("click", () => fileInput.click());

    // Editor JSON (fonte de verdade)
    const textarea = createEl("textarea", {
      id: "teamEditorTextarea",
      style: [
        "width:100%",
        "min-height:220px",
        "font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        "font-size:12px",
        "line-height:1.4",
        "background:rgba(0,0,0,.25)",
        "color:inherit",
        "border:1px solid rgba(255,255,255,.16)",
        "border-radius:10px",
        "padding:10px",
        "box-sizing:border-box",
      ].join(";")
    });

    function setTextareaFromItems(items) {
      textarea.value = JSON.stringify(items || [], null, 2);
    }

    function getItemsFromTextarea() {
      const parsed = safeJsonParse(textarea.value);
      const norm = normalizeItems(parsed);
      return norm || [];
    }

    // Seção "Inserir item"
    const addTitle = createEl("div", { style: "margin-top:10px;font-weight:700;" }, "Inserir item (linha completa)");
    const grid = createEl("div", {
      style: [
        "display:grid",
        "grid-template-columns:repeat(6, minmax(0, 1fr))",
        "gap:8px",
        "margin-top:8px",
      ].join(";")
    });

    const inCode = createEl("input", { placeholder: "code (ex: M01)", style: "padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;" });
    const inLabel = createEl("input", { placeholder: "label", style: "padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;" });
    const inProvider = createEl("input", { placeholder: "provider", style: "padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;" });
    const inUrl = createEl("input", { placeholder: "url (https://...)", style: "padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;grid-column:span 2;" });
    const inChecked = createEl("select", { style: "padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:inherit;" }, [
      createEl("option", { value: "true" }, "checked: true"),
      createEl("option", { value: "false" }, "checked: false"),
    ]);

    const btnAdd = createEl("button", { type: "button", class: "btn", style: "white-space:nowrap;" }, "➕ Inserir");

    // Responsivo: em telas pequenas, a grid vira coluna
    const responsiveHint = createEl("div", { style: "opacity:.75;font-size:12px;margin-top:6px;" },
      "Dica: você pode editar direto no JSON acima, ou usar o bloco de inserção para adicionar uma linha completa."
    );

    // Ajuste grid para mobile via JS (sem CSS externo)
    if (window.matchMedia && window.matchMedia("(max-width: 700px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
      inUrl.style.gridColumn = "span 1";
    }

    grid.append(inCode, inLabel, inProvider, inUrl, inChecked, btnAdd);

    btnAdd.addEventListener("click", () => {
      const item = {
        code: (inCode.value || "").trim(),
        label: (inLabel.value || "").trim(),
        provider: (inProvider.value || "").trim(),
        url: (inUrl.value || "").trim(),
        checked: inChecked.value === "true",
        img: "",
      };

      if (!item.url) {
        alert("Informe uma URL válida para inserir o item.");
        return;
      }

      const items = getItemsFromTextarea();
      items.push(item);
      setTextareaFromItems(items);

      // limpa inputs básicos
      inCode.value = "";
      inLabel.value = "";
      inProvider.value = "";
      inUrl.value = "";
      inChecked.value = "true";
    });

    // Rodapé de status
    const status = createEl("div", { style: "margin-top:10px;font-size:12px;opacity:.85;" }, "");

    function setStatus(msg) {
      status.textContent = msg || "";
    }

    // Ações
    btnSave.addEventListener("click", () => {
      const items = getItemsFromTextarea();
      localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(items));
      activeItems = items;

      renderIAList(activeItems);
      bindOpenAllButton(activeItems);

      setStatus("✅ Salvo no localStorage (override ativo).");
    });

    btnExport.addEventListener("click", () => {
      const items = getItemsFromTextarea();
      const content = JSON.stringify({ items }, null, 2);
      downloadTextFile(`${groupId}.items.json`, content, "application/json;charset=utf-8");
      setStatus("⬇️ Exportado. (Agora é só subir esse arquivo no GitHub, se quiser versionar.)");
    });

    btnClear.addEventListener("click", () => {
      localStorage.removeItem(LS_ITEMS_KEY);
      setStatus("♻️ Override removido. Recarregando fonte padrão...");
      overlay.dataset.locked = "0";
      overlay.remove();
      location.reload();
    });

    btnReload.addEventListener("click", async () => {
      const lsItems = loadItemsFromLocalStorage();
      if (lsItems) {
        setTextareaFromItems(lsItems);
        setStatus("🔄 Recarregado do localStorage (override ativo).");
        return;
      }
      const fileItems = await loadItemsFromJsonFile();
      if (fileItems) {
        setTextareaFromItems(fileItems);
        setStatus("🔄 Recarregado do arquivo .items.json.");
        return;
      }
      const fallback = normalizeItems(group.items) || [];
      setTextareaFromItems(fallback);
      setStatus("🔄 Recarregado do fallback (group.items do JS).");
    });

    fileInput.addEventListener("change", () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const raw = (reader.result || "").toString();
        const data = safeJsonParse(raw);

        const candidate = Array.isArray(data) ? data : data?.items;
        const norm = normalizeItems(candidate);

        if (!norm) {
          alert("Arquivo inválido. Esperado: { items: [...] } ou [...]");
          return;
        }

        setTextareaFromItems(norm);
        setStatus("⬆️ Importado. Agora clique em “Salvar (local)” para ativar o override.");
      };
      reader.readAsText(file);
    });

    // Conteúdo inicial do editor: preferir a fonte ativa (activeItems).
    setTextareaFromItems(activeItems);

    modal.append(header, actions, fileInput, textarea, addTitle, grid, responsiveHint, status);
    overlay.appendChild(modal);

    // Fecha ao clicar fora do modal
 //   overlay.addEventListener("click", (e) => {
 //     if (e.target === overlay) overlay.remove();
 //   });

    document.body.appendChild(overlay);
  }

  // =========================================
  //  Load items using Option 3 priority
  // =========================================
  (async () => {
    // 1) LocalStorage override
    const lsItems = loadItemsFromLocalStorage();
    if (lsItems) {
      activeItems = lsItems;
      renderIAList(activeItems);
      bindOpenAllButton(activeItems);
      ensureEditorButton();
      return;
    }

    // 2) JSON file override (descriptions/<groupId>.items.json)
    const fileItems = await loadItemsFromJsonFile();
    if (fileItems) {
      activeItems = fileItems;
      renderIAList(activeItems);
      bindOpenAllButton(activeItems);
      ensureEditorButton();
      return;
    }

    // 3) Fallback to JS group.items (se existir)
    activeItems = normalizeItems(group.items) || [];
    renderIAList(activeItems);
    bindOpenAllButton(activeItems);
    ensureEditorButton();
  })();
});
