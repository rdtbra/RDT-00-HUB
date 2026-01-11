/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js (RESTORE COMPLETO DA INTERFACE)
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

  // --- SINCRONIZAÇÃO DE CABEÇALHO ---
  function loadGroupData() {
    const localHeader = localStorage.getItem(`ia-launcher-config:Estudos:group:${groupId}`);
    if (localHeader) return JSON.parse(localHeader);
    const groups = Array.isArray(window.GROUPS) ? window.GROUPS : [];
    return groups.find(g => g.id === groupId);
  }

  const group = loadGroupData();
  if (!groupId || !group) return;

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  // Elementos da UI principal
  const titleEl = document.getElementById("coverTitle") || document.getElementById("groupTitle");
  const imgEl   = document.getElementById("coverImage") || document.getElementById("groupIcon");
  const iaList  = document.getElementById("iaList");

  if (titleEl) {
    titleEl.textContent = group.name;
    titleEl.style.color = group.color || "#8b86ff";
  }
  document.title = `${TITLE_PREFIX} – ${group.name}`;
  if (imgEl) imgEl.src = group.icon || "";

  // --- FUNÇÕES DE SUPORTE (ORIGINAIS) ---
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
      li.className = "ia-item-row";
      li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label}</a>`;
      iaList.appendChild(li);
    });
  }

  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "onclick") el.addEventListener("click", v);
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k === "class" ? "class" : k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  }

  // --- O SEU EDITOR ORIGINAL COM CAMPOS SEPARADOS E BOTÕES ---
  function openEditorModal() {
    const activeItems = loadItems();
    const overlay = createEl("div", {
      style: "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;"
    });

    const modal = createEl("div", {
      style: "background:#1e1e2e;padding:25px;border-radius:12px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,0.1);color:#fff;display:flex;flex-direction:column;gap:15px;"
    });

    const header = createEl("div", { style: "display:flex;justify-content:space-between;align-items:center;" }, [
      createEl("h3", { style: "margin:0" }, `🛠️ Editor de Equipe: ${group.name}`),
      createEl("button", { class: "btn", onclick: () => overlay.remove() }, "✖")
    ]);

    const rowsCont = createEl("div", { id: "editorRows", style: "display:flex;flex-direction:column;gap:10px;" });

    function createRow(item) {
      const row = createEl("div", { style: "display:grid;grid-template-columns:80px 1fr 1fr 2fr 50px;gap:10px;align-items:center;background:#111;padding:10px;border-radius:8px;" });
      
      const inCode = createEl("input", { type: "text", value: item.code, placeholder: "Cód", style: "background:#222;border:1px solid #444;color:#fff;padding:5px;" });
      const inLabel = createEl("input", { type: "text", value: item.label, placeholder: "Nome", style: "background:#222;border:1px solid #444;color:#fff;padding:5px;" });
      const inProv = createEl("input", { type: "text", value: item.provider, placeholder: "Provider", style: "background:#222;border:1px solid #444;color:#fff;padding:5px;" });
      const inUrl = createEl("input", { type: "text", value: item.url, placeholder: "URL", style: "background:#222;border:1px solid #444;color:#fff;padding:5px;" });
      const btnDel = createEl("button", { class: "btn", style: "background:#ff5f56;padding:5px;", onclick: () => row.remove() }, "✖");

      row.append(inCode, inLabel, inProv, inUrl, btnDel);
      return row;
    }

    activeItems.forEach(it => rowsCont.appendChild(createRow(it)));

    const footer = createEl("div", { style: "display:flex;justify-content:space-between;margin-top:20px;" }, [
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", { class: "btn", onclick: () => {
          const fin = createEl("input", { type: "file", accept: ".json" });
          fin.onchange = e => {
            const reader = new FileReader();
            reader.onload = () => {
              const data = safeJsonParse(reader.result);
              const items = Array.isArray(data) ? data : (data.items || []);
              rowsCont.innerHTML = "";
              items.forEach(it => rowsCont.appendChild(createRow(it)));
            };
            reader.readAsText(e.target.files[0]);
          };
          fin.click();
        }}, "⬆️ Importar JSON"),
        createEl("button", { class: "btn", onclick: () => {
          const rows = Array.from(rowsCont.children).map(r => ({
            code: r.children[0].value, label: r.children[1].value, provider: r.children[2].value, url: r.children[3].value, checked: true
          }));
          const blob = new Blob([JSON.stringify({items: rows}, null, 2)], {type: "application/json"});
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${groupId}.items.json`; a.click();
        }}, "⬇️ Exportar JSON")
      ]),
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", { class: "btn", style: "background:#444;", onclick: () => overlay.remove() }, "Cancelar"),
        createEl("button", { class: "btn", style: "background:#22c55e;font-weight:bold;", onclick: () => {
          const rows = Array.from(rowsCont.children).map(r => ({
            code: r.children[0].value, label: r.children[1].value, provider: r.children[2].value, url: r.children[3].value, checked: true
          }));
          localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(rows));
          renderIAList(rows);
          overlay.remove();
        }}, "💾 Salvar Alterações")
      ])
    ]);

    modal.append(header, createEl("button", { class: "btn", style: "align-self:flex-start;background:#444;", onclick: () => rowsCont.appendChild(createRow({code:"", label:"", provider:"", url:""})) }, "+ Adicionar IA"), rowsCont, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function ensureEditorButton() {
    if (document.getElementById("editTeamBtn")) return;
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;
    const btn = createEl("button", { id: "editTeamBtn", class: "btn", style: "margin-left:10px;", onclick: openEditorModal }, "✏️ Editar itens");
    openAllBtn.insertAdjacentElement("afterend", btn);
  }

  // --- INICIALIZAÇÃO CORRIGIDA (SEM MODAL AUTOMÁTICO) ---
  (async () => {
    const items = loadItems();
    renderIAList(items);
    ensureEditorButton();
    // A única coisa que retirei aqui foi o "if (st && st.open) openEditorModal();" que causava o loop.
  })();
});