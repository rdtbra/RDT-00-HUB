// script-launcher.js
// Lógica compartilhada dos launchers (EMT, DV, PRJ, Pessoal, Beyond, etc.).
// Requer duas variáveis globais definidas ANTES deste script:
//   const KEY = "ia-launcher-config:AlgumaCoisa";
//   const DEFAULT_GROUPS = [ ... ];

(function () {
  // --- Validação básica ---
  if (typeof KEY === "undefined") {
    console.error("[launcher] Variável global KEY não definida.");
    return;
  }
  if (typeof DEFAULT_GROUPS === "undefined") {
    console.error("[launcher] Variável global DEFAULT_GROUPS não definida.");
    return;
  }

  // --- Utilidades de armazenamento ---
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULT_GROUPS;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return DEFAULT_GROUPS;
      return parsed;
    } catch (e) {
      console.warn("[launcher] Falha ao carregar do localStorage, usando DEFAULT_GROUPS.", e);
      return DEFAULT_GROUPS;
    }
  }

  function save(groups) {
    try {
      localStorage.setItem(KEY, JSON.stringify(groups));
    } catch (e) {
      console.warn("[launcher] Falha ao salvar no localStorage.", e);
    }
  }

  // --- Utilidades gerais ---
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
    return (str || "").replace(/[&<>]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c];
    });
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  function buildUrlWithHash(url, title, useTM) {
    if (!useTM || !url) return url;
    const enc = encodeURIComponent(title || "");
    return url + (url.includes("#") ? "&" : "#") + "tabtitle=" + enc;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  // --- Estado principal ---
  let groups = load();

  // --- Referências de DOM (algumas são opcionais) ---
  const groupsEl = document.getElementById("groups");
  if (!groupsEl) {
    console.error("[launcher] Elemento #groups não encontrado.");
    return;
  }

  const delayEl = document.getElementById("delay");
  const tmTitleEl = document.getElementById("tmTitle");

  const openAllBtn = document.getElementById("openAll");
  const addGroupBtn = document.getElementById("addGroup");
  const exportBtn = document.getElementById("export");
  const importBtn = document.getElementById("import");
  const resetBtn = document.getElementById("reset");

  // --- Renderização dos grupos e itens ---
  function render() {
    groupsEl.innerHTML = "";

    groups.forEach(function (g, gi) {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeftColor = g.color || "#8b86ff";

      card.innerHTML = [
        '<div class="head">',
        '  <h2 class="chev" data-act="toggle">',
        '    <span class="gicon-wrap"><a href="' + (g.iconHref || "#") + '" target="_blank" rel="noopener">',
        '      <img class="gicon" src="' + (g.icon || "") + '" alt="icon">',
        "    </a></span>",
        '    <span class="chip" style="background:' + (g.color || "#8b86ff") + '"></span>' + escapeHtml(g.name || "Grupo"),
        "  </h2>",
        '  <div class="actions">',
        '    <button class="btn" data-act="open-group">Abrir todas</button>',
        '    <button class="btn" data-act="add-item">+ Item</button>',
        '    <button class="btn" data-act="edit-group">Editar</button>',
        '    <button class="btn" data-act="remove-group">Remover</button>',
        "  </div>",
        "</div>",
        '<div class="grid" data-role="grid" style="display:' + (g.collapsed ? "none" : "grid") + '"></div>'
      ].join("");

      const grid = card.querySelector("[data-role='grid']");

      (g.items || []).forEach(function (item, ii) {
        const row = document.createElement("div");
        row.className = "item";

        const safeUrl = escapeAttr(item.url || "");
        const text = [item.code || "", item.label || "", item.provider || ""].filter(Boolean).join(" | ");

		row.innerHTML = [
			'<div class="left">',
			'  <input class="checkbox" type="checkbox" ' + (item.checked === false ? "" : "checked") + ' data-role="check">',
			'  <div class="composite" title="' + escapeAttr(text) + '">' + escapeHtml(text) + "</div>",
			"</div>",
			'<div class="urlbox">',
			'  <input class="url" type="text" value="' + safeUrl + '" placeholder="https://...">',
			"</div>",
			'<div style="display:flex;gap:6px">',
			'  <a class="btn" data-role="open" href="' + (safeUrl || "#") + '" target="_blank" rel="noopener noreferrer">Abrir</a>',
			'  <button class="btn" data-act="remove">Remover</button>',
			"</div>"
		].join("");

        // checkbox
        const checkEl = row.querySelector("[data-role='check']");
        checkEl.addEventListener("change", function (e) {
          g.items[ii].checked = e.target.checked;
          save(groups);
        });

        // input de URL + link "Abrir"
        const urlInput = row.querySelector(".url");
        const openA = row.querySelector("a.btn");

        urlInput.addEventListener("input", function (e) {
          const v = e.target.value;
          g.items[ii].url = v;
          save(groups);
          openA.href = v || "#";
        });

        openA.addEventListener("click", function () {
          if (!tmTitleEl || !tmTitleEl.checked) return;
          openA.href = buildUrlWithHash(
            g.items[ii].url,
            compositeText(g.items[ii], g.name),
            true
          );
        });

        // botão Remover item
        const removeBtn = row.querySelector("[data-act='remove']");
        removeBtn.addEventListener("click", function () {
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

      addItemBtn.addEventListener("click", function () {
        const url = prompt("Cole a URL (https://...)");
        if (!url) return;
        const code = prompt("Código (ex.: M01)") || "";
        const label = prompt("Nome da IA/site") || url;
        const provider = prompt("Empresa/Fornecedor", "");

        g.items.push({
          code: code,
          label: label,
          provider: provider,
          url: url,
          checked: true,
          img: ""
        });
        save(groups);
        render();
      });

      editGroupBtn.addEventListener("click", function () {
        const name = prompt("Nome do grupo:", g.name || "");
        if (name === null) return;
        const color = prompt("Cor (hex):", g.color || "#8b86ff");
        if (color === null) return;
        const icon = prompt("Ícone (URL, ex.: assets/beyond.png)", g.icon || "");
        if (icon === null) return;
        const iconHref = prompt("Link do ícone (ex.: GitHub, Drive):", g.iconHref || "#");
        if (iconHref === null) return;

        g.name = name;
        g.color = color || "#8b86ff";
        g.icon = icon;
        g.iconHref = iconHref || "#";

        save(groups);
        render();
      });

      removeGroupBtn.addEventListener("click", function () {
        if (!confirm("Remover grupo?")) return;
        groups.splice(gi, 1);
        save(groups);
        render();
      });

      openGroupBtn.addEventListener("click", function () {
        const urls = (g.items || [])
          .filter(function (it) { return it.checked !== false && it.url; })
          .map(function (it) {
            const useTM = !!(tmTitleEl && tmTitleEl.checked);
            return buildUrlWithHash(it.url, compositeText(it, g.name), useTM);
          });
        const delayMs = delayEl ? Number(delayEl.value || 0) : 0;
        openMany(urls, delayMs);
      });

      toggleHead.addEventListener("click", function () {
        g.collapsed = !g.collapsed;
        save(groups);
        render();
      });

      groupsEl.appendChild(card);
    });
  }

  // --- Abrir múltiplas URLs ---
  function openMany(urls, delayMs) {
    if (!urls || !urls.length) {
      alert("Nenhuma URL selecionada.");
      return;
    }

    delayMs = delayMs || 0;

    (async function () {
      for (let i = 0; i < urls.length; i++) {
        const u = urls[i];
        try {
          window.open(u, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("[launcher] Falha ao abrir URL:", u, e);
        }
        if (delayMs > 0) {
          await sleep(delayMs);
        }
      }
    })();
  }

  // --- Exportar / Importar configuração ---
  function exportJson() {
    try {
      const blob = new Blob([JSON.stringify(groups, null, 2)], {
        type: "application/json"
      });
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
  }

  function importJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const data = JSON.parse(reader.result);
          if (Array.isArray(data)) {
            groups = data;
            save(groups);
            render();
          } else {
            alert("JSON inválido (esperado array).");
          }
        } catch (err) {
          console.error("[launcher] Erro ao ler JSON importado.", err);
          alert("Falha ao ler JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // --- Ligações de botões globais (se existirem) ---
  if (openAllBtn) {
    openAllBtn.addEventListener("click", function () {
      const urls = [];
      groups.forEach(function (g) {
        (g.items || []).forEach(function (it) {
          if (it.checked === false || !it.url) return;
          const useTM = !!(tmTitleEl && tmTitleEl.checked);
          urls.push(buildUrlWithHash(it.url, compositeText(it, g.name), useTM));
        });
      });
      const delayMs = delayEl ? Number(delayEl.value || 0) : 0;
      openMany(urls, delayMs);
    });
  }

  if (addGroupBtn) {
    addGroupBtn.addEventListener("click", function () {
      const name = prompt("Nome do novo grupo:");
      if (!name) return;
      const color = prompt("Cor (hex, ex.: #8b86ff)", "#8b86ff") || "#8b86ff";
      const icon = prompt("Ícone (URL, ex.: assets/meu-icone.png)", "");
      const iconHref = prompt("Link do ícone (ex.: GitHub, Drive)", "#") || "#";

      let id;
      if (window.crypto && crypto.randomUUID) {
        id = crypto.randomUUID();
      } else {
        id = "g_" + Math.random().toString(36).slice(2);
      }

      groups.push({
        id: id,
        name: name,
        color: color,
        icon: icon,
        iconHref: iconHref,
        collapsed: true,
        items: []
      });
      save(groups);
      render();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", exportJson);
  }

  if (importBtn) {
    importBtn.addEventListener("click", importJson);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (!confirm("Restaurar configuração padrão? Isso apagará alterações locais.")) return;
      groups = DEFAULT_GROUPS;
      save(groups);
      render();
    });
  }

  // --- Primeira renderização ---
  render();
})();
