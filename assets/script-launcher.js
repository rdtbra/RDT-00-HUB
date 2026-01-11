/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-launcher.js
 * Função: Orquestrador Final - Sem campos de estado (collapsed)
 * ============================================================
 */

(function () {
  if (typeof KEY === "undefined") return;

  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // --- Lógica de Prioridade (Cascata) ---
  async function getGroupData(g) {
    const id = g.id;
    const localHeader = localStorage.getItem(`${KEY}:group:${id}`);
    const localItems = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${id}`);
    
    if (localHeader && localItems) {
      return { ...JSON.parse(localHeader), items: JSON.parse(localItems) };
    }

    try {
      const respH = await fetch(`descriptions/${id}.group.json`);
      if (respH.ok) {
        const header = await respH.json();
        const respI = await fetch(`descriptions/${id}.items.json`);
        const itemsData = respI.ok ? await respI.json() : null;
        return { 
          ...header, 
          items: itemsData ? (Array.isArray(itemsData) ? itemsData : itemsData.items) : (g.items || [])
        };
      }
    } catch (e) {}

    return g; 
  }

  // --- Migração de Dados ---
  function migrateData(oldId, newId) {
    if (!oldId || !newId || oldId === newId) return;
    const oldKey = `ia-launcher-config:${APP_ID}:items:${oldId}`;
    const newKey = `ia-launcher-config:${APP_ID}:items:${newId}`;
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data);
      localStorage.removeItem(oldKey);
    }
  }

  // --- Helpers de Download ---
  function downloadFile(filename, content, type = "application/json") {
    const blob = new Blob([content], { type: type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function slugifyId(input) {
    return (input || "").toString().trim().toLowerCase()
      .replace(/\s+/g, "-").replace(/[^a-z0-9\-_.]/g, "")
      .replace(/\-+/g, "-").replace(/^\-|\-$/g, "");
  }

  function makeUniqueId(base, groups, currentId = null) {
    const b = slugifyId(base) || "grupo";
    const exists = (id) => groups.some(g => g.id === id && g.id !== currentId);
    if (!exists(b)) return b;
    for (let i = 2; i < 999; i++) {
      const candidate = `${b}-${i}`;
      if (!exists(candidate)) return candidate;
    }
    return `${b}-${Date.now()}`;
  }

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

  // --- Inicialização ---
  let activeGroups = [];
  const groupsEl = document.getElementById("groups");
  const addGroupBtn = document.getElementById("addGroup");
  const exportAllBtn = document.getElementById("exportAll") || document.getElementById("export"); 
  const resetBtn = document.getElementById("reset");

  async function init() {
    const openAllGhost = document.getElementById("openAll") || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Abrir TUDO'));
    if (openAllGhost) openAllGhost.remove();

    const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
    activeGroups = await Promise.all(originalGroups.map(g => getGroupData(g)));
    render();
    setupActions();
  }

  function openModal(mode, groupData = null) {
    const isEdit = mode === "edit";
    const oldId = isEdit ? groupData.id : null;
    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
    const modal = document.createElement("div");
    modal.style = "background:var(--card-bg, #1e1e2e); padding:25px; border-radius:12px; width:100%; max-width:500px; border:1px solid #444; color:#fff; position:relative;";
    
    modal.innerHTML = `
      <button id="mCloseX" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#888; cursor:pointer; font-size:24px;">&times;</button>
      <h3 style="margin-top:0;">${isEdit ? "✏️ Editar Material" : "🚀 Novo Material"}</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label style="font-size:11px; color:#aaa;">NOME:</label>
        <input id="mName" type="text" value="${isEdit ? groupData.name : "Novo Grupo"}" style="padding:8px; background:#111; border:1px solid #444; color:#fff;">
        <label style="font-size:11px; color:#aaa;">ID (SLUG):</label>
        <input id="mId" type="text" value="${isEdit ? groupData.id : makeUniqueId("Novo Grupo", activeGroups)}" style="padding:8px; background:#111; border:1px solid #444; color:#8b86ff;">
        <label style="font-size:11px; color:#aaa;">URL DO ÍCONE:</label>
        <input id="mIcon" type="text" value="${isEdit ? (groupData.icon || "") : ""}" placeholder="https://..." style="padding:8px; background:#111; border:1px solid #444; color:#fff;">
        <label style="font-size:11px; color:#aaa;">URL DO MATERIAL (DESTINO):</label>
        <input id="mIconHref" type="text" value="${isEdit ? (groupData.iconHref || "") : ""}" placeholder="https://..." style="padding:8px; background:#111; border:1px solid #444; color:#fff;">
        <label style="font-size:11px; color:#aaa;">COR:</label>
        <input id="mColor" type="color" value="${isEdit ? (groupData.color || "#8b86ff") : "#8b86ff"}" style="width:100%; height:35px; background:none; border:none; cursor:pointer;">
        ${!isEdit ? `
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="mPrefill" checked>
          <label for="mPrefill" style="font-size:12px;">Preencher equipe padrão (M01-REV)</label>
        </div>` : ""}
      </div>
      <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
        <button id="mCancel" class="btn" style="background:#444;">Cancelar</button>
        <button id="mSave" class="btn" style="background:#8b86ff; font-weight:bold;">Salvar</button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    const nameIn = document.getElementById("mName");
    const idIn = document.getElementById("mId");
    if (!isEdit) nameIn.oninput = () => { idIn.value = makeUniqueId(nameIn.value, activeGroups); };

    document.getElementById("mSave").onclick = () => {
      const newId = slugifyId(idIn.value);
      if (isEdit) {
        migrateData(oldId, newId);
        groupData.id = newId;
        groupData.name = nameIn.value;
        groupData.color = document.getElementById("mColor").value;
        groupData.icon = document.getElementById("mIcon").value;
        groupData.iconHref = document.getElementById("mIconHref").value;
        localStorage.setItem(`${KEY}:group:${newId}`, JSON.stringify({
          id: groupData.id,
          name: groupData.name,
          color: groupData.color,
          icon: groupData.icon,
          iconHref: groupData.iconHref
        }));
      } else {
        const newG = { 
          id: newId, 
          name: nameIn.value, 
          color: document.getElementById("mColor").value, 
          icon: document.getElementById("mIcon").value, 
          iconHref: document.getElementById("mIconHref").value, 
          items: document.getElementById("mPrefill").checked ? teamTemplate7() : [] 
        };
        activeGroups.push(newG);
        localStorage.setItem(`${KEY}:group:${newId}`, JSON.stringify({
          id: newG.id, name: newG.name, color: newG.color, icon: newG.icon, iconHref: newG.iconHref
        }));
        localStorage.setItem(`ia-launcher-config:${APP_ID}:items:${newId}`, JSON.stringify(newG.items));
      }
      render();
      overlay.remove();
    };

    document.getElementById("mCancel").onclick = () => overlay.remove();
    document.getElementById("mCloseX").onclick = () => overlay.remove();
  }

  function setupActions() {
    if (addGroupBtn) addGroupBtn.onclick = () => openModal("create");
    if (exportAllBtn) {
      exportAllBtn.onclick = () => {
        // Remove 'collapsed' de todos os itens antes de exportar o backup .js
        const cleanGroups = activeGroups.map(({ collapsed, ...rest }) => rest);
        const content = `/** Backup Consolidado **/\nconst GROUPS = ${JSON.stringify(cleanGroups, null, 2)};`;
        downloadFile("estudos-groups.js", content, "text/javascript");
      };
    }
    if (resetBtn) resetBtn.onclick = () => { if (confirm("Restaurar padrão?")) { localStorage.clear(); location.reload(); } };
  }

  function render() {
    if (!groupsEl) return;
    groupsEl.innerHTML = "";
    activeGroups.forEach((g) => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.borderLeft = `5px solid ${g.color || "#8b86ff"}`;
      card.innerHTML = `
        <div class="head">
          <h2 class="chev" style="cursor:pointer" data-act="toggle">
            <span class="gicon-wrap">
              <a href="${g.iconHref || "#"}" target="_blank"><img class="gicon" src="${g.icon || ""}" onerror="this.style.display='none'"></a>
            </span>
            <span class="chip" style="background:${g.color}"></span> ${g.name}
          </h2>
          <div class="actions">
            <button class="btn" data-act="open-cover">Capa</button>
            <button class="btn" data-act="edit-material">Editar</button>
            <button class="btn" data-act="export-disco">Exportar Disco</button>
          </div>
        </div>
        <div class="grid" data-role="grid" style="display:${g.collapsed ? "none" : "grid"}; gap:5px; padding:10px;"></div>
      `;

      card.querySelector("[data-act='edit-material']").onclick = () => openModal("edit", g);

      const grid = card.querySelector("[data-role='grid']");
      (g.items || []).forEach((item) => {
        const row = document.createElement("div");
        row.className = "item";
        row.style = "display: flex; align-items: center; gap: 10px; margin-bottom: 4px;";
        row.innerHTML = `
          <div class="left" style="display:flex; align-items:center; gap:8px; flex: 1;">
            <input type="checkbox" ${item.checked !== false ? "checked" : ""}>
            <div class="composite" style="font-size:12px;">${item.code} | ${item.label}</div>
          </div>
          <div class="urlbox" style="flex: 2;"><input class="url" type="text" value="${item.url || ""}" style="width:100%; background:#111; color:#ccc; border:1px solid #333;"></div>
          <a class="btn" href="${item.url || "#"}" target="_blank" style="font-size:11px;">Abrir</a>
        `;
        grid.appendChild(row);
      });

      card.querySelector("[data-act='open-cover']").onclick = () => {
        const cp = (typeof GROUP_COVER_PAGE !== "undefined") ? GROUP_COVER_PAGE : "index.html";
        window.open(`${cp}?group=${encodeURIComponent(g.id)}`, "_blank");
      };

      card.querySelector("[data-act='export-disco']").onclick = () => {
        // Exportação individual estritamente sem campos de UI
        const h = {id:g.id, name:g.name, color:g.color, icon:g.icon, iconHref:g.iconHref};
        downloadFile(`${g.id}.group.json`, JSON.stringify(h, null, 2));
        downloadFile(`${g.id}.items.json`, JSON.stringify({items:g.items}, null, 2));
      };

      card.querySelector("[data-act='toggle']").onclick = () => {
        g.collapsed = !g.collapsed;
        grid.style.display = g.collapsed ? "none" : "grid";
      };

      groupsEl.appendChild(card);
    });
  }

  init();
})();