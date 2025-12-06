// script-launcher.js
// Lógica compartilhada dos launchers (EMT, DV, PRJ, Pessoal, Beyond, etc.).
// Requer duas variáveis globais definidas ANTES deste script:
//   const KEY = "ia-launcher-config:AlgumaCoisa";
//   const GROUPS = [ ... ];

(function () {
  // --- Validação ---
  if (typeof KEY === "undefined") {
    console.error("[launcher] Variável global KEY não definida.");
    return;
  }
  if (typeof GROUPS === "undefined") {
    console.error("[launcher] GROUPS não definida.");
    return;
  }

  // --- Storage ---
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return GROUPS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return GROUPS;
      return parsed;
    } catch (e) {
      console.warn("[launcher] Falha ao carregar storage.", e);
      return GROUPS;
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

  // Tampermonkey removido. Mantemos a função por compatibilidade interna.
  function buildUrlWithHash(url, title, useTM) {
    return url || "";
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // --- Estado ---
  let groups = load();
  save(groups);

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
      const addItemBtn = card.querySelector("[data-act='add-item']");
      const editGroupBtn = card.querySelector("[data-act='edit-group']");
      const removeGroupBtn = card.querySelector("[data-act='remove-group']");
      const openGroupBtn = card.querySelector("[data-act='open-group']");
      const toggleHead = card.querySelector("[data-act='toggle']");

      addItemBtn.addEventListener("click", () => {
        const url = prompt("Cole a URL (https://...)");
        if (!url) return;
        const code = prompt("Código (ex.: M01)") || "";
        const label = prompt("Nome da IA/site") || url;
        const provider = prompt("Empresa/Fornecedor", "");

        g.items.push({
          code,
          label,
          provider,
          url,
          checked: true,
          img: ""
        });
        save(groups);
        render();
      });

      editGroupBtn.addEventListener("click", () => {
        const name = prompt("Nome do grupo:", g.name || "");
        if (name === null) return;
        const color = prompt("Cor (hex):", g.color || "#8b86ff");
        if (color === null) return;
        const icon = prompt("Ícone (URL):", g.icon || "");
        if (icon === null) return;
        const iconHref = prompt("Link do ícone:", g.iconHref || "#");
        if (iconHref === null) return;

        g.name = name;
        g.color = color || "#8b86ff";
        g.icon = icon;
        g.iconHref = iconHref || "#";

        save(groups);
        render();
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
    groups = GROUPS;
    save(groups);
    render();
  });

  // Inicialização
  render();
})();
