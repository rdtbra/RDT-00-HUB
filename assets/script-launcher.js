(function () {
  console.log("🚀 script-launcher.js iniciado");

  if (typeof KEY === "undefined") {
    console.error("❌ KEY não está definida!");
    return;
  }

  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();
  console.log("📦 APP_ID:", APP_ID);

  // --- Helpers ---
  function downloadFile(filename, content, type = "text/javascript") {
    const blob = new Blob([content], { type: type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function validateSlug(input) {
    const slug = (input || "").toString().trim();
    if (!slug) return null;
    const valid = /
^
[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]
$
|
^
[a-zA-Z0-9]
$
/.test(slug);
    return valid ? slug : null;
  }

  function showFeedback(msg, type = "info") {
    console.log(`[${type.toUpperCase()}] ${msg}`);

    const existing = document.querySelector(".feedback-toast");
    if (existing) existing.remove();

    const feedback = document.createElement("div");
    feedback.className = "feedback-toast";
    feedback.style = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 20px 30px;
      border-radius: 12px;
      color: #fff;
      font-weight: bold;
      z-index: 10001;
      background: ${type === "error" ? "#ef4444" : "#22c55e"};
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      animation: slideIn 0.3s ease;
      max-width: 350px;
    `;
    feedback.innerHTML = msg;
    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.style.opacity = "0";
      feedback.style.transform = "translateX(50px)";
      setTimeout(() => feedback.remove(), 300);
    }, 4000);
  }

  // ✅ Busca grupos do localStorage
  function getLocalGroups() {
    const groups = [];
    const prefix = `${KEY}:group:`;

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.id) {
            groups.push(data);
          }
        } catch (e) {
          console.warn("⚠️ Erro ao parsear:", key);
        }
      }
    });

    return groups;
  }

  // --- Lógica de Sincronização ---
  async function getGroupData(g) {
    const id = g.id;

    // Prioridade 1: LocalStorage
    const localHeader = localStorage.getItem(`${KEY}:group:${id}`);
    const localItems = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${id}`);

    if (localHeader || localItems) {
      const header = localHeader ? JSON.parse(localHeader) : g;
      const items = localItems ? JSON.parse(localItems) : (g.items || []);
      return {
        ...header,
        items: Array.isArray(items) ? items : (items.items || []),
        source: 'localStorage'
      };
    }

    // Prioridade 2: FileSystem
    try {
      const respH = await fetch(`descriptions/${id}.group.json`);
      if (respH.ok) {
        const header = await respH.json();
        const respI = await fetch(`descriptions/${id}.items.json`);
        const itemsData = respI.ok ? await respI.json() : null;
        return {
          ...header,
          items: itemsData ? (Array.isArray(itemsData) ? itemsData : itemsData.items) : (g.items || []),
          source: 'filesystem'
        };
      }
    } catch (e) {}

    // Prioridade 3: JS Original
    return { ...g, source: 'javascript' };
  }

  // --- Inicialização ---
  let activeGroups = [];
  const groupsEl = document.getElementById("groups");
  const addGroupBtn = document.getElementById("addGroup") || document.getElementById("newGroup");
  const exportAllBtn = document.getElementById("exportAll") || document.getElementById("export");
  const resetBtn = document.getElementById("reset");

  console.log("🎯 Elementos encontrados:", {
    groupsEl: !!groupsEl,
    addGroupBtn: !!addGroupBtn
  });

  async function init() {
    console.log("📋 init() chamada");

    const openAllGhost = document.getElementById("openAll") || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Abrir TUDO'));
    if (openAllGhost) {
      console.log("🗑️ Removendo botão ghost");
      openAllGhost.remove();
    }

    // Grupos do JS original
    const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
    console.log(`📥 ${originalGroups.length} grupos do JS original`);

    // Grupos do localStorage
    const localGroups = getLocalGroups();
    console.log(`📥 ${localGroups.length} grupos do localStorage`);

    // Mescla
    const allGroupsMap = new Map();
    originalGroups.forEach(g => allGroupsMap.set(g.id, g));
    localGroups.forEach(g => allGroupsMap.set(g.id, g));
    const allGroups = Array.from(allGroupsMap.values());
    console.log(`📊 ${allGroups.length} grupos totais (após mescla)`);

    // Carrega dados
    activeGroups = await Promise.all(allGroups.map(g => getGroupData(g)));

    console.log(`✅ ${activeGroups.length} grupos carregados`);
    console.log("📋 IDs dos grupos:", activeGroups.map(g => `${g.id} [${g.source || '?'}]`));

    render();
    setupActions();
  }

  function openModal(mode, groupData = null) {
    const isEdit = mode === "edit";
    const oldId = isEdit ? groupData.id : "";

    console.log(`📝 Abrindo modal: ${mode}`, isEdit ? groupData.id : "novo");

    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
    const modal = document.createElement("div");
    modal.style = "background:#1e1e2e; padding:30px; border-radius:16px; width:100%; max-width:550px; border:1px solid #555; color:#fff; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.5);";

    modal.innerHTML = `
      <button id="mCloseX" style="position:absolute; top:15px; right:15px; background:none; border:none; color:#888; cursor:pointer; font-size:28px; line-height:1;">&times;</button>
      <h2 style="margin:0 0 20px 0; color:#fff;">${isEdit ? "✏️ Editar Material" : "🚀 Adicionar Material"}</h2>
      <div style="display:flex; flex-direction:column; gap:15px;">
        <div>
          <label style="font-size:12px; color:#8b86ff; font-weight:bold;">NOME DO MATERIAL</label>
          <input id="mName" type="text" value="${isEdit ? groupData.name : ""}" placeholder="Ex: EMT-37-EE - Estrutura Englobante" style="width:100%; padding:12px; background:#0d0d0d; border:1px solid #333; color:#fff; border-radius:8px; font-size:14px; box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px; color:#22c55e; font-weight:bold;">ID (SLUG) ⭐ OBRIGATÓRIO</label>
          <input id="mId" type="text" value="${oldId}" placeholder="Ex: emt-37-ee" style="width:100%; padding:12px; background:#0d0d0d; border:1px solid #333; color:#8b86ff; border-radius:8px; font-size:14px; font-family:monospace; box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px; color:#aaa;">URL DO ÍCONE (opcional)</label>
          <input id="mIcon" type="text" value="${isEdit ? (groupData.icon || "") : ""}" placeholder="https://..." style="width:100%; padding:12px; background:#0d0d0d; border:1px solid #333; color:#fff; border-radius:8px; font-size:14px; box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px; color:#aaa;">URL DO MATERIAL DE REFERÊNCIA (opcional)</label>
          <input id="mIconHref" type="text" value="${isEdit ? (groupData.iconHref || "") : ""}" placeholder="https://drive.google.com/..." style="width:100%; padding:12px; background:#0d0d0d; border:1px solid #333; color:#fff; border-radius:8px; font-size:14px; box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:12px; color:#aaa;">COR</label>
          <div style="display:flex; align-items:center; gap:10px;">
            <input id="mColor" type="color" value="${isEdit ? (groupData.color || "#8b86ff") : "#8b86ff"}" style="width:40px; height:40px; border:none;">
            <span style="font-size:12px; color:#aaa;">${isEdit ? (groupData.color || "#8b86ff") : "#8b86ff"}</span>
          </div>
        </div>
        <div id="mError" style="color:#ef4444; font-size:12px; display:none;"></div>
        <div style="display:flex; justify-content:space-between;">
          <button id="mCancel" style="background:#444; border:none; color:#fff; padding:10px 20px; border-radius:8px; cursor:pointer;">Cancelar</button>
          <button id="mSave" style="background:#22c55e; border:none; color:#fff; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">Salvar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    document.getElementById("mSave").onclick = () => {
      console.log("🖱️ Botão Salvar clicado");

      const name = document.getElementById("mName").value.trim();
      const idInput = document.getElementById("mId").value.trim();
      const icon = document.getElementById("mIcon").value.trim();
      const iconHref = document.getElementById("mIconHref").value.trim();
      const color = document.getElementById("mColor").value;
      const errorDiv = document.getElementById("mError");

      if (!name || !idInput) {
        errorDiv.textContent = "Nome e ID são obrigatórios!";
        errorDiv.style.display = "block";
        return;
      }

      const newId = validateSlug(idInput);
      if (!newId) {
        errorDiv.textContent = "ID inválido! Use apenas letras, números, hífens e underscores.";
        errorDiv.style.display = "block";
        return;
      }

      const group = {
        id: newId,
        name,
        icon,
        iconHref,
        color,
        items: []
      };

      if (isEdit) {
        const index = activeGroups.findIndex(g => g.id === oldId);
        if (index !== -1) {
          activeGroups[index] = group;
          localStorage.setItem(`${KEY}:group:${newId}`, JSON.stringify(group));
          localStorage.removeItem(`${KEY}:group:${oldId}`);
        }
      } else {
        activeGroups.push(group);
        localStorage.setItem(`${KEY}:group:${newId}`, JSON.stringify(group));
      }

      localStorage.setItem(`ia-launcher-config:${APP_ID}:items:${newId}`, JSON.stringify(group.items));
      render();
      overlay.remove();
      showFeedback("✅ Grupo salvo com sucesso!", "success");
    };

    document.getElementById("mCloseX").onclick = () => overlay.remove();
    document.getElementById("mCancel").onclick = () => overlay.remove();
  }

  function render() {
    groupsEl.innerHTML = "";
    activeGroups.forEach(g => {
      const card = document.createElement("div");
      card.className = "group-card";
      card.style = `
        background: #1e1e2e;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
        color: #fff;
        position: relative;
      `;

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 class="group-name" style="color:${g.color || "#8b86ff"}; cursor:pointer;">${g.name}</h3>
          <div>
            <button class="btn btn-edit" style="background:#444; margin-left:10px;">✏️</button>
            <button class="btn btn-export" style="background:#22c55e; margin-left:10px;">⬇️</button>
          </div>
        </div>
        <div class="grid" style="display:${g.items.length ? 'grid' : 'none'}; gap:10px; margin-top:15px;">
          ${g.items.map(item => `
            <div style="background:#0d0d0d; padding:10px; border-radius:8px; border:1px solid #444;">
              <a href="${item.url}" target="_blank" style="color:#8b86ff; text-decoration:none;">${item.code} - ${item.label}</a>
            </div>
          `).join('')}
        </div>
      `;

      const editBtn = card.querySelector(".btn-edit");
      if (editBtn) {
        editBtn.onclick = (e) => {
          e.stopPropagation();
          console.log("✏️ Editando:", g.id);
          openModal("edit", g);
        };
      }

      const exportBtn = card.querySelector(".btn-export");
      if (exportBtn) {
        exportBtn.onclick = (e) => {
          e.stopPropagation();
          downloadFile(`${g.id}.group.json`, JSON.stringify({
            id: g.id,
            name: g.name,
            color: g.color,
            icon: g.icon,
            iconHref: g.iconHref
          }, null, 2));
          downloadFile(`${g.id}.items.json`, JSON.stringify({items: g.items || []}, null, 2));
          showFeedback("✅ Arquivos exportados!", "success");
        };
      }

      const nameEl = card.querySelector(".group-name");
      if (nameEl) {
        nameEl.onclick = () => {
          console.log("🖱️ Clicou no nome (toggle):", g.id);
          const grid = card.querySelector(".grid");
          if (grid) {
            const isHidden = grid.style.display === "none";
            grid.style.display = isHidden ? "grid" : "none";
            console.log(`📋 Lista ${g.id}: ${isHidden ? 'ABERTA' : 'FECHADA'}`);
          }
        };
        nameEl.style.cursor = "pointer";
      }

      groupsEl.appendChild(card);
    });
  }

  // CSS animation
  if (!document.getElementById("feedback-styles")) {
    const style = document.createElement("style");
    style.id = "feedback-styles";
    style.innerHTML = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .group-name:hover {
        opacity: 0.8;
      }
      .group-name:active {
        opacity: 0.6;
      }
    `;
    document.head.appendChild(style);
  }

  console.log("✅ script-launcher.js carregado completamente");
  init();
})();
