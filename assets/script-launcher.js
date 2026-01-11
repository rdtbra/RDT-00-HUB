// script-launcher.js
// Lógica compartilhada dos launchers (EMT, DV, PRJ, Pessoal, Beyond, etc.).
// Requer variáveis globais definidas ANTES deste script:
//   const KEY = "ia-launcher-config:AlgumaCoisa";
//   const DEFAULT_GROUPS = [ ... ];
//
// (NOVO) Caso DEFAULT_GROUPS não exista, tentamos usar window.GROUPS como fallback.
// (NOVO) Implementa o botão +Grupo (#addGroup) para criar grupo inteiro via UI,
//       com opção de pré-criar a equipe padrão (M01..M05, SUP, REV).

(function () {
  // --- Validação ---
  if (typeof KEY === "undefined") {
    console.error("[launcher] Variável global KEY não definida.");
    return;
  }

  // Fallback: se DEFAULT_GROUPS não foi definido no HTML, tentamos window.GROUPS.
  // Mantém compatibilidade com hubs antigos e evita o erro "DEFAULT_GROUPS is not defined".
  const DEFAULT_GROUPS_SAFE = (function () {
    if (typeof DEFAULT_GROUPS !== "undefined" && Array.isArray(DEFAULT_GROUPS)) return DEFAULT_GROUPS;
    if (Array.isArray(window.GROUPS)) return window.GROUPS;
    console.error("[launcher] DEFAULT_GROUPS não definida e window.GROUPS não disponível.");
    return [];
  })();

  // --- Storage ---
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT_GROUPS_SAFE;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_GROUPS_SAFE;
      return parsed;
    } catch (e) {
      console.warn("[launcher] Falha ao carregar storage.", e);
      return DEFAULT_GROUPS_SAFE;
    }
  }

  function save(groups) {
    try {
      localStorage.setItem(KEY, JSON.stringify(groups));
    } catch (e) {
      console.warn("[launcher] Falha ao salvar storage.", e);
    }
  }

  // --- Utilidades ---
  function compositeText(item, groupName) {
    const parts = [
      groupName || "",
      item.code || "",
      item.label || "",
      item.provider || ""
    ].filter(Boolean);
    return parts.join("|");
  }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;"
    })[c]);
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  // =========================================================
  // UI Helpers: Modal FIXO (substitui prompt/confirm)
  // - Não fecha ao clicar fora
  // - Não some ao mudar foco/janelas (dentro do possível)
  // =========================================================
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") el.className = v;
      else if (k === "style") el.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) el.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (c == null) return;
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  }

  function openFixedModal({ title, subtitle, contentEl, onClose }) {
    const overlay = createEl("div", {
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

    const modal = createEl("div", {
      style: [
        "width:min(720px, 96vw)",
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

    // FIXO: não fecha ao clicar fora
    overlay.addEventListener("click", (e) => {
      // intencionalmente não fecha
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // Evita vazamento de eventos
    modal.addEventListener("click", (e) => e.stopPropagation(), true);
    modal.addEventListener("mousedown", (e) => e.stopPropagation(), true);
    modal.addEventListener("contextmenu", (e) => e.stopPropagation(), true);

    const header = createEl("div", { style: "display:flex;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:10px;" }, [
      createEl("div", {}, [
        createEl("div", { style: "font-weight:700;font-size:16px;" }, title || "Editor"),
        subtitle ? createEl("div", { style: "opacity:.85;font-size:12px;margin-top:2px;" }, subtitle) : null,
      ]),
      createEl("button", { type: "button", class: "btn", style: "padding:8px 10px;" }, "✖ Fechar"),
    ]);

    const closeBtn = header.querySelector("button");
    function close() {
      try { overlay.remove(); } catch {}
      if (typeof onClose === "function") onClose();
    }
    closeBtn.addEventListener("click", close);

    modal.appendChild(header);
    if (contentEl) modal.appendChild(contentEl);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    return { overlay, modal, close };
  }

  function buildFormRow(label, inputEl, hint) {
    const wrap = createEl("div", { style: "display:flex;flex-direction:column;gap:4px;" });
    wrap.appendChild(createEl("div", { style: "font-size:12px;opacity:.9;" }, label));
    wrap.appendChild(inputEl);
    if (hint) wrap.appendChild(createEl("div", { style: "font-size:11px;opacity:.75;" }, hint));
    return wrap;
  }

  function inputBaseStyle(extra = "") {
    return [
      "padding:8px",
      "border-radius:10px",
      "border:1px solid rgba(255,255,255,.16)",
      "background:rgba(0,0,0,.25)",
      "color:inherit",
      "box-sizing:border-box",
      extra
    ].filter(Boolean).join(";");
  }

  function openGroupFormModal({ mode, group, suggestedId, onSubmit }) {
    const isEdit = mode === "edit";
    const title = isEdit ? "Editar grupo" : "Criar novo grupo";
    const subtitle = isEdit ? (group?.id || "") : "Preencha os campos e clique em Salvar";

    const name = createEl("input", { value: group?.name || "", placeholder: "Ex.: EMT-99-XX - Novo tópico", style: inputBaseStyle() });
    const id = createEl("input", { value: group?.id || suggestedId || "", placeholder: "ex.: emt-99-xx", style: inputBaseStyle() });
    const color = createEl("input", { value: group?.color || "#8b86ff", placeholder: "#8b86ff", style: inputBaseStyle(), type: "text" });
    const icon = createEl("input", { value: group?.icon || "", placeholder: "assets/EMT-99-XX.png ou https://...", style: inputBaseStyle() });
    const iconHref = createEl("input", { value: group?.iconHref || "#", placeholder: "https://drive.google.com/...", style: inputBaseStyle() });

    const prefillWrap = createEl("label", { style: "display:flex;gap:8px;align-items:center;margin-top:6px;user-select:none;" }, [
      createEl("input", { type: "checkbox", checked: true }),
      createEl("span", { style: "font-size:12px;opacity:.9;" }, "Criar equipe padrão (M01..M05, SUP, REV)")
    ]);

    // Em modo edit, não altera items por padrão
    if (isEdit) prefillWrap.style.display = "none";

    const actions = createEl("div", { style: "display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap;" });
    const saveBtn = createEl("button", { type: "button", class: "btn" }, "💾 Salvar");
    const cancelBtn = createEl("button", { type: "button", class: "btn" }, "Cancelar");
    actions.append(cancelBtn, saveBtn);

    const grid = createEl("div", {
      style: [
        "display:grid",
        "grid-template-columns:repeat(2, minmax(0, 1fr))",
        "gap:10px"
      ].join(";")
    }, [
      buildFormRow("Nome", name),
      buildFormRow("ID", id, "Usado em links de capa e arquivo descriptions/<id>.txt"),
      buildFormRow("Cor (hex)", color, "Ex.: #0ea5e9"),
      buildFormRow("Ícone (path/URL)", icon),
      buildFormRow("Link do ícone/material", iconHref),
    ]);

    if (window.matchMedia && window.matchMedia("(max-width: 700px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
    }

    const body = createEl("div", {}, [grid, prefillWrap, actions]);

    const modal = openFixedModal({ title, subtitle, contentEl: body });

    cancelBtn.addEventListener("click", modal.close);

    saveBtn.addEventListener("click", () => {
      const data = {
        name: (name.value || "").trim(),
        id: slugifyId((id.value || "").trim()),
        color: (color.value || "").trim() || "#8b86ff",
        icon: (icon.value || "").trim(),
        iconHref: (iconHref.value || "").trim() || "#",
        prefillTeam: !isEdit && !!prefillWrap.querySelector("input")?.checked,
      };
      onSubmit(data, modal);
    });

    // foco inicial
    setTimeout(() => name.focus(), 0);
  }

  function openItemFormModal({ groupName, onSubmit }) {
    const url = createEl("input", { placeholder: "https://...", style: inputBaseStyle() });
    const code = createEl("input", { placeholder: "M01", style: inputBaseStyle() });
    const label = createEl("input", { placeholder: "Nome da IA/site", style: inputBaseStyle() });
    const provider = createEl("input", { placeholder: "Fornecedor (AdaptaONE, openAI, etc.)", style: inputBaseStyle() });

    const checkedWrap = createEl("label", { style: "display:flex;gap:8px;align-items:center;margin-top:6px;user-select:none;" }, [
      createEl("input", { type: "checkbox", checked: true }),
      createEl("span", { style: "font-size:12px;opacity:.9;" }, "Marcado (abrir em Abrir todas)")
    ]);

    const actions = createEl("div", { style: "display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap;" });
    const saveBtn = createEl("button", { type: "button", class: "btn" }, "💾 Inserir");
    const cancelBtn = createEl("button", { type: "button", class: "btn" }, "Cancelar");
    actions.append(cancelBtn, saveBtn);

    const grid = createEl("div", {
      style: [
        "display:grid",
        "grid-template-columns:repeat(2, minmax(0, 1fr))",
        "gap:10px"
      ].join(";")
    }, [
      buildFormRow("URL", url),
      buildFormRow("Código", code),
      buildFormRow("Label", label),
      buildFormRow("Provider", provider),
    ]);

    if (window.matchMedia && window.matchMedia("(max-width: 700px)").matches) {
      grid.style.gridTemplateColumns = "1fr";
    }

    const body = createEl("div", {}, [grid, checkedWrap, actions]);
    const modal = openFixedModal({ title: "Adicionar item", subtitle: groupName || "", contentEl: body });

    cancelBtn.addEventListener("click", modal.close);
    saveBtn.addEventListener("click", () => {
      const data = {
        url: (url.value || "").trim(),
        code: (code.value || "").trim(),
        label: (label.value || "").trim(),
        provider: (provider.value || "").trim(),
        checked: !!checkedWrap.querySelector("input")?.checked,
      };
      onSubmit(data, modal);
    });

    setTimeout(() => url.focus(), 0);
  }

  // Tampermonkey removido. Mantemos a função por compatibilidade interna.
  function buildUrlWithHash(url, title, useTM) {
    return url || "";
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function slugifyId(input) {
    return (input || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_.]/g, "")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "");
  }

  // --- Estado ---
  let groups = load();
  save(groups);

  function isIdAvailable(id) {
    return !groups.some(g => (g.id || "") === id);
  }

  function makeUniqueId(base) {
    const b = slugifyId(base) || "grupo";
    if (isIdAvailable(b)) return b;
    for (let i = 2; i < 9999; i++) {
      const candidate = `${b}-${i}`;
      if (isIdAvailable(candidate)) return candidate;
    }
    return `${b}-${Date.now()}`;
  }

  function teamTemplate7() {
    // URLs começam vazias: você preenche depois pelo +Item ou editando os campos.
    return [
      { code: "M01", label: "", provider: "", url: "", checked: true, img: "" },
      { code: "M02", label: "", provider: "", url: "", checked: true, img: "" },
      { code: "M03", label: "", provider: "", url: "", checked: true, img: "" },
      { code: "M04", label: "", provider: "", url: "", checked: true, img: "" },
      { code: "M05", label: "", provider: "", url: "", checked: true, img: "" },
      { code: "SUP", label: "", provider: "", url: "", checked: true, img: "" },
      { code: "REV", label: "", provider: "", url: "", checked: true, img: "" }
    ];
  }

  // --- DOM ---
  const groupsEl = document.getElementById("groups");
  if (!groupsEl) {
    console.error("[launcher] #groups não encontrado.");
    return;
  }

  const delayEl = document.getElementById("delay");
  const openAllBtn = document.getElementById("openAll");
  const addGroupBtn = document.getElementById("addGroup");
  const exportBtn = document.getElementById("export");
  const importBtn = document.getElementById("import");
  const resetBtn = document.getElementById("reset");

  // --- Renderização ---
  function render() {
    groupsEl.innerHTML = "";

    groups.forEach((g, gi) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeftColor = g.color || "#8b86ff";

      card.innerHTML = `
        <div class="head">
          <h2 class="chev" data-act="toggle">
            <span class="gicon-wrap">
              <a href="${g.iconHref || "#"}" target="_blank" rel="noopener">
                <img class="gicon" src="${g.icon || ""}" alt="icon">
              </a>
            </span>
            <span class="chip" style="background:${g.color || "#8b86ff"}"></span>
            ${escapeHtml(g.name || "Grupo")}
          </h2>
          <div class="actions">
            <button class="btn" data-act="open-cover">Abrir capa</button>          
            <button class="btn" data-act="open-group">Abrir todas</button>
            <button class="btn" data-act="add-item">+ Item</button>
            <button class="btn" data-act="edit-group">Editar</button>
            <button class="btn" data-act="remove-group">Remover</button>
          </div>
        </div>
        <div class="grid" data-role="grid" style="display:${g.collapsed ? "none" : "grid"}"></div>
      `;

      const grid = card.querySelector("[data-role='grid']");

      // Itens
      (g.items || []).forEach((item, ii) => {
        const safeUrl = escapeAttr(item.url || "");
        const text = [item.code, item.label, item.provider].filter(Boolean).join(" | ");

        const row = document.createElement("div");
        row.className = "item";
        row.innerHTML = `
          <div class="left">
            <input class="checkbox" type="checkbox" ${item.checked === false ? "" : "checked"} data-role="check">
            <div class="composite" title="${escapeAttr(text)}">${escapeHtml(text)}</div>
          </div>
          <div class="urlbox">
            <input class="url" type="text" value="${safeUrl}" placeholder="https://...">
          </div>
          <div style="display:flex;gap:6px">
            <a class="btn" data-role="open" href="${safeUrl || "#"}" target="_blank" rel="noopener noreferrer">Abrir</a>
            <button class="btn" data-act="remove">Remover</button>
          </div>
        `;

        // checkbox
        row.querySelector("[data-role='check']").addEventListener("change", e => {
          g.items[ii].checked = e.target.checked;
          save(groups);
        });

        // URL
        const urlInput = row.querySelector(".url");
        const openA = row.querySelector("a.btn");

        urlInput.addEventListener("input", e => {
          const v = e.target.value;
          g.items[ii].url = v;
          save(groups);
          openA.href = v || "#";
        });

        // Remover item
        row.querySelector("[data-act='remove']").addEventListener("click", () => {
          g.items.splice(ii, 1);
          save(groups);
          render();
        });

        grid.appendChild(row);
      });

      // Ações do grupo
      const openCoverBtn = card.querySelector("[data-act='open-cover']");
      const addItemBtn = card.querySelector("[data-act='add-item']");
      const editGroupBtn = card.querySelector("[data-act='edit-group']");
      const removeGroupBtn = card.querySelector("[data-act='remove-group']");
      const openGroupBtn = card.querySelector("[data-act='open-group']");
      const toggleHead = card.querySelector("[data-act='toggle']");

      openCoverBtn.addEventListener("click", () => {
        if (!GROUP_COVER_PAGE) {
          alert("Nenhuma capa configurada para este hub.");
          return;
        }
        const coverUrl = GROUP_COVER_PAGE + "?group=" + encodeURIComponent(g.id || "");
        window.open(coverUrl, "_blank", "noopener,noreferrer");
      });

      addItemBtn.addEventListener("click", () => {
        openItemFormModal({
          groupName: g.name,
          onSubmit: (data, modal) => {
            if (!data.url) { alert("Informe uma URL válida."); return; }
            g.items = Array.isArray(g.items) ? g.items : [];
            g.items.push({
              code: data.code || "",
              label: data.label || data.url,
              provider: data.provider || "",
              url: data.url,
              checked: data.checked !== false,
              img: ""
            });
            save(groups);
            render();
            modal.close();
          }
        });
      });
        save(groups);
        render();
      });

      editGroupBtn.addEventListener("click", () => {
        openGroupFormModal({
          mode: "edit",
          group: g,
          suggestedId: g.id || makeUniqueId(g.name || "grupo"),
          onSubmit: (data, modal) => {
            if (!data.name) { alert("Informe um nome."); return; }
            if (!data.id) { alert("ID inválido."); return; }
            // Se mudar ID, checa colisão
            if (data.id !== (g.id || "") && !isIdAvailable(data.id)) {
              alert("Esse ID já existe. Escolha outro.");
              return;
            }
            g.name = data.name;
            g.id = data.id;
            g.color = data.color || "#8b86ff";
            g.icon = data.icon || "";
            g.iconHref = data.iconHref || "#";
            save(groups);
            render();
            modal.close();
          }
        });
      });

      removeGroupBtn.addEventListener("click", () => {
        if (!confirm("Remover grupo?")) return;
        groups.splice(gi, 1);
        save(groups);
        render();
      });

      // 🔥 Abrir grupo — totalmente sem tmTitleEl
      openGroupBtn.addEventListener("click", () => {
        const urls = (g.items || [])
          .filter(it => it.checked !== false && it.url)
          .map(it => buildUrlWithHash(it.url, compositeText(it, g.name), false));

        const delayMs = delayEl ? Number(delayEl.value || 0) : 0;

        // Suporte opcional para CAPA
        var coverPage = typeof GROUP_COVER_PAGE !== "undefined" ? GROUP_COVER_PAGE : null;
        var openCoverLastEl = document.getElementById("openCoverLast");
        var openCoverLast = !!(openCoverLastEl && openCoverLastEl.checked);

        var finalUrls = urls.slice();

        if (coverPage) {
          var coverUrl = coverPage + "?group=" + encodeURIComponent(g.id || "");
          if (openCoverLast) finalUrls.push(coverUrl);
          else finalUrls.unshift(coverUrl);
        }

        openMany(finalUrls, delayMs);
      });

      toggleHead.addEventListener("click", () => {
        g.collapsed = !g.collapsed;
        save(groups);
        render();
      });

      groupsEl.appendChild(card);
    });
  }

  // --- Abrir TODAS as URLs — também sem tmTitleEl ---
  function openMany(urls, delayMs) {
    if (!urls || !urls.length) {
      alert("Nenhuma URL selecionada.");
      return;
    }
    delayMs = delayMs || 0;

    (async () => {
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        try {
          window.open(u, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("[launcher] Falha ao abrir URL:", u, e);
        }
        if (delayMs > 0) await sleep(delayMs);
      }
    })();
  }

  // --- Botão Abrir Todas (global) ---
  if (openAllBtn) {
    openAllBtn.addEventListener("click", () => {
      const urls = [];
      groups.forEach(g => {
        (g.items || []).forEach(it => {
          if (it.checked === false || !it.url) return;
          urls.push(buildUrlWithHash(it.url, compositeText(it, g.name), false));
        });
      });
      const delayMs = delayEl ? Number(delayEl.value || 0) : 0;
      openMany(urls, delayMs);
    });
  }

  // --- Botão +Grupo (global) ---
  if (addGroupBtn) {
    addGroupBtn.addEventListener("click", () => {
      const suggestedId = makeUniqueId("novo-grupo");
      openGroupFormModal({
        mode: "create",
        group: { name: "", id: "", color: "#8b86ff", icon: "", iconHref: "#" },
        suggestedId,
        onSubmit: (data, modal) => {
          if (!data.name) { alert("Informe um nome."); return; }
          if (!data.id) { alert("ID inválido."); return; }
          if (!isIdAvailable(data.id)) { alert("Esse ID já existe. Escolha outro."); return; }

          const items = data.prefillTeam ? teamTemplate7() : [];

          const g = {
            id: data.id,
            name: data.name,
            color: data.color || "#8b86ff",
            icon: data.icon || "",
            iconHref: data.iconHref || "#",
            collapsed: false,
            items
          };

          // cria no final da lista
          groups.push(g);
          save(groups);
          render();
          modal.close();
        }
      });
    });
  }

  // --- Exportar / Importar ---
  if (exportBtn) exportBtn.addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(groups, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (KEY || "launcher-config") + ".json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[launcher] Falha ao exportar JSON.", e);
      alert("Falha ao exportar JSON.");
    }
  });

  if (importBtn) importBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data)) {
            groups = data;
            save(groups);
            render();
          } else {
            alert("JSON inválido.");
          }
        } catch (err) {
          console.error("[launcher] Erro ao importar JSON.", err);
          alert("Falha ao ler JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  if (resetBtn) resetBtn.addEventListener("click", () => {
    if (!confirm("Restaurar configuração padrão?")) return;
    groups = DEFAULT_GROUPS_SAFE;
    save(groups);
    render();
  });

  // Inicialização
  render();
})();