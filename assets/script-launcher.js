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
  // --- Validação de Variáveis Globais ---
  if (typeof KEY === "undefined") {
    console.error("[launcher] Erro crítico: Variável KEY não definida.");
    return;
  }

  // APP_ID para identificar as chaves de itens da capa no LocalStorage
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // Fallback de segurança para os grupos iniciais
  const DEFAULT_GROUPS_SAFE = (function () {
    if (typeof DEFAULT_GROUPS !== "undefined" && Array.isArray(DEFAULT_GROUPS)) {
      return DEFAULT_GROUPS;
    }
    if (Array.isArray(window.GROUPS)) {
      return window.GROUPS;
    }
    return [];
  })();

  // --- Persistência (Storage) ---

  /**
   * Carrega os grupos do LocalStorage e sincroniza com os dados da Capa
   */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      let loadedGroups = DEFAULT_GROUPS_SAFE;

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          loadedGroups = parsed;
        }
      }

      // SINCRONIZAÇÃO AUTOMÁTICA: Prioriza dados editados na capa
      return syncItemsFromCovers(loadedGroups);

    } catch (e) {
      console.warn("[launcher] Erro ao carregar dados do LocalStorage.", e);
      return DEFAULT_GROUPS_SAFE;
    }
  }

  /**
   * Ponte Automática: Se houver edição na capa, o Launcher reflete aqui
   */
  function syncItemsFromCovers(allGroups) {
    return allGroups.map(g => {
      // Chave específica gerada pelo script-cover.js
      const coverKey = `ia-launcher-config:${APP_ID}:items:${g.id}`;
      const rawCoverItems = localStorage.getItem(coverKey);
      
      if (rawCoverItems) {
        try {
          const coverItems = JSON.parse(rawCoverItems);
          if (Array.isArray(coverItems)) {
            // Substitui itens do launcher pelos da capa
            return { ...g, items: coverItems };
          }
        } catch (e) {
          console.warn(`[sync] Erro na sincronização do grupo ${g.id}`, e);
        }
      }
      return g;
    });
  }

  function save(groups) {
    try {
      localStorage.setItem(KEY, JSON.stringify(groups));
    } catch (e) {
      console.error("[launcher] Erro ao salvar no LocalStorage.", e);
    }
  }

  // --- Helpers de Interface (UI) ---

  function escapeHtml(str) {
    return (str || "").replace(/[&<>]/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;"
    })[c]);
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, "&quot;");
  }

  function slugifyId(input) {
    return (input || "").toString().trim().toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_.]/g, "")
      .replace(/\-+/g, "-")
      .replace(/^\-|\-$/g, "");
  }

  // --- Estado do Aplicativo ---
  let groups = load();

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

  /**
   * Template para criação de equipes padrão
   */
  function teamTemplate7() {
    return [
      { code: "M01", label: "", provider: "", url: "", checked: true },
      { code: "M02", label: "", provider: "", url: "", checked: true },
      { code: "M03", label: "", provider: "", url: "", checked: true },
      { code: "M04", label: "", provider: "", url: "", checked: true },
      { code: "M05", label: "", provider: "", url: "", checked: true },
      { code: "SUP", label: "", provider: "", url: "", checked: true },
      { code: "REV", label: "", provider: "", url: "", checked: true }
    ];
  }

  // --- Renderização ---

  const groupsEl = document.getElementById("groups");
  const delayEl = document.getElementById("delay");
  const addGroupBtn = document.getElementById("addGroup");
  const resetBtn = document.getElementById("reset");

  function render() {
    if (!groupsEl) return;
    groupsEl.innerHTML = "";

    groups.forEach((g, gi) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeftColor = g.color || "#8b86ff";

      card.innerHTML = `
        <div class="head">
          <h2 class="chev" data-act="toggle">
            <span class="gicon-wrap">
              <a href="${g.iconHref || "#"}" target="_blank">
                <img class="gicon" src="${g.icon || ""}" alt="icon">
              </a>
            </span>
            <span class="chip" style="background:${g.color || "#8b86ff"}"></span>
            ${escapeHtml(g.name || "Novo Grupo")}
          </h2>
          <div class="actions">
            <button class="btn" data-act="open-cover">Abrir capa</button>          
            <button class="btn" data-act="open-group">Abrir todas</button>
            <button class="btn" data-act="add-item">+ Item</button>
            <button class="btn" data-act="remove-group">Remover</button>
          </div>
        </div>
        <div class="grid" data-role="grid" style="display:${g.collapsed ? "none" : "grid"}"></div>
      `;

      const grid = card.querySelector("[data-role='grid']");

      (g.items || []).forEach((item, ii) => {
        const row = document.createElement("div");
        row.className = "item";
        const labelFull = [item.code, item.label, item.provider].filter(Boolean).join(" | ");

        row.innerHTML = `
          <div class="left">
            <input class="checkbox" type="checkbox" ${item.checked !== false ? "checked" : ""} data-role="check">
            <div class="composite">${escapeHtml(labelFull)}</div>
          </div>
          <div class="urlbox">
            <input class="url" type="text" value="${escapeAttr(item.url || "")}" placeholder="https://...">
          </div>
          <div style="display:flex; gap:6px;">
            <a class="btn" href="${item.url || "#"}" target="_blank">Abrir</a>
            <button class="btn" data-act="remove-item">Remover</button>
          </div>
        `;

        row.querySelector("[data-role='check']").onchange = (e) => {
          g.items[ii].checked = e.target.checked;
          save(groups);
        };

        const urlIn = row.querySelector(".url");
        urlIn.oninput = (e) => {
          g.items[ii].url = e.target.value;
          save(groups);
          row.querySelector("a.btn").href = e.target.value;
        };

        row.querySelector("[data-act='remove-item']").onclick = () => {
          g.items.splice(ii, 1);
          save(groups);
          render();
        };

        grid.appendChild(row);
      });

      // Eventos do Card
      card.querySelector("[data-act='open-cover']").onclick = () => {
        const url = GROUP_COVER_PAGE + "?group=" + encodeURIComponent(g.id || "");
        window.open(url, "_blank");
      };

      card.querySelector("[data-act='open-group']").onclick = () => {
        const urls = g.items.filter(it => it.checked && it.url).map(it => it.url);
        const delay = delayEl ? Number(delayEl.value) : 0;
        openMany(urls, delay);
      };

      card.querySelector("[data-act='add-item']").onclick = () => {
        const url = prompt("Cole a URL do novo item:");
        if (url) {
          g.items.push({ code: "M00", label: "Novo Item", provider: "", url, checked: true });
          save(groups);
          render();
        }
      };

      card.querySelector("[data-act='remove-group']").onclick = () => {
        if (confirm(`Deseja remover o grupo "${g.name}"?`)) {
          groups.splice(gi, 1);
          save(groups);
          render();
        }
      };

      card.querySelector("[data-act='toggle']").onclick = () => {
        g.collapsed = !g.collapsed;
        save(groups);
        render();
      };

      groupsEl.appendChild(card);
    });
  }

  function openMany(urls, delayMs) {
    (async () => {
      for (const u of urls) {
        window.open(u, "_blank");
        if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
      }
    })();
  }

  // --- Modal do Botão +Grupo (Lógica Persistente) ---
  if (addGroupBtn) {
    addGroupBtn.onclick = () => {
      const overlay = document.createElement("div");
      overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
      
      const modal = document.createElement("div");
      modal.style = "background:var(--card-bg, #1e1e2e); padding:25px; border-radius:12px; width:100%; max-width:450px; border:1px solid rgba(255,255,255,0.1); color:#fff; position:relative;";
      
      const initialId = makeUniqueId("Novo Grupo");

      modal.innerHTML = `
        <button id="mCloseX" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#888; cursor:pointer; font-size:24px;">&times;</button>
        <h3 style="margin-top:0; margin-bottom:20px;">🚀 Criar Novo Grupo</h3>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px;">Nome do Grupo:</label>
            <input id="mName" type="text" value="Novo Grupo" style="width:100%; padding:10px; background:#111; border:1px solid #444; color:#fff; border-radius:6px;">
          </div>
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px;">ID (Slug):</label>
            <input id="mId" type="text" value="${initialId}" style="width:100%; padding:10px; background:#111; border:1px solid #444; color:#aaa; font-family:monospace; border-radius:6px;">
          </div>
          <div>
            <label style="display:block; font-size:12px; margin-bottom:4px;">Cor:</label>
            <input id="mColor" type="color" value="#8b86ff" style="width:100%; height:40px; background:none; border:none; cursor:pointer;">
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="mPrefill" checked>
            <label for="mPrefill" style="font-size:13px; cursor:pointer;">Criar equipe padrão</label>
          </div>
        </div>
        <div style="margin-top:25px; display:flex; gap:10px; justify-content:flex-end;">
          <button id="mCancel" class="btn" style="background:#444; padding:8px 16px;">Cancelar</button>
          <button id="mSave" class="btn" style="background:#8b86ff; padding:8px 16px; font-weight:bold;">Criar</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const nameIn = document.getElementById("mName");
      const idIn = document.getElementById("mId");
      nameIn.oninput = () => { idIn.value = makeUniqueId(nameIn.value); };

      document.getElementById("mSave").onclick = () => {
        const finalId = slugifyId(idIn.value);
        if (!isIdAvailable(finalId)) {
          alert("Este ID já está em uso.");
          return;
        }
        groups.push({
          id: finalId,
          name: nameIn.value || "Grupo Sem Nome",
          color: document.getElementById("mColor").value,
          collapsed: false,
          items: document.getElementById("mPrefill").checked ? teamTemplate7() : []
        });
        save(groups);
        render();
        overlay.remove();
      };

      document.getElementById("mCancel").onclick = () => overlay.remove();
      document.getElementById("mCloseX").onclick = () => overlay.remove();
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm("Resetar tudo?")) {
        localStorage.clear();
        location.reload();
      }
    };
  }

  render();
})();