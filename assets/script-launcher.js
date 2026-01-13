/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-launcher.js (CORRIGIDO: Layout original + clique no nome)
 * ============================================================
 */

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
    const valid = /^[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(slug);
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
      <h2 style="margin:0 0 20px 0; color:#fff;">${isEdit ? "✏️ Editar Material" : "🚀 Novo Material"}</h2>
      
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
            <input id="mColor" type="color" value="${isEdit ? (groupData.color || "#8b86ff") : "#8b86ff"}" style="width:60px; height:40px; background:none; border:none; cursor:pointer;">
            <span style="color:#666; font-size:12px;">Clique para escolher a cor</span>
          </div>
        </div>
      </div>
      
      <div id="mError" style="color:#ef4444; font-size:13px; margin:15px 0; padding:10px; background:rgba(239,68,68,0.1); border-radius:8px; display:none; border-left:3px solid #ef4444;"></div>
      
      <div style="margin-top:25px; display:flex; gap:10px; justify-content:flex-end;">
        <button id="mCancel" class="btn" style="background:#333; padding:12px 24px; border-radius:8px;">Cancelar</button>
        <button id="mSave" class="btn" style="background:linear-gradient(135deg, #8b86ff, #6c63ff); padding:12px 30px; border-radius:8px; font-weight:bold;">💾 Salvar</button>
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

      console.log("📝 Dados preenchidos:", { name, idInput, icon, iconHref });

      errorDiv.style.display = "none";

      if (!name) {
        errorDiv.innerText = "⚠️ O nome é obrigatório!";
        errorDiv.style.display = "block";
        return;
      }

      if (!idInput) {
        errorDiv.innerText = "⚠️ O ID (slug) é obrigatório!";
        errorDiv.style.display = "block";
        return;
      }

      const newId = validateSlug(idInput);
      if (!newId) {
        errorDiv.innerText = "⚠️ ID inválido! Use apenas letras, números, hífen (-), underscore (_) e ponto (.).";
        errorDiv.style.display = "block";
        return;
      }

      console.log("✅ Validação passou, salvando...");

      const updatedData = {
        id: newId,
        name: name,
        color: color,
        icon: icon,
        iconHref: iconHref,
        collapsed: true,
        items: isEdit ? groupData.items : [
          {
            code: "M01",
            label: "Nova IA",
            url: "",
            checked: true
          }
        ]

      };

      const key = `${KEY}:group:${newId}`;
      localStorage.setItem(key, JSON.stringify(updatedData));
      
      console.log("💾 Salvou no localStorage:", key);
      console.log("📦 Dados salvos:", updatedData);

      const verify = localStorage.getItem(key);
      console.log("🔍 Verificação:", verify ? "✅ Salvo com sucesso!" : "❌ ERRO ao salvar!");

      showFeedback("✅ Material salvo com sucesso!", "success");

      overlay.remove();
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    document.getElementById("mCancel").onclick = () => {
      console.log("❌ Cancelado");
      overlay.remove();
    };
    document.getElementById("mCloseX").onclick = () => overlay.remove();
    overlay.onclick = (e) => { 
      if (e.target === overlay) {
        console.log("❌ Fechou pelo overlay");
        overlay.remove(); 
      }
    };
  }

  function setupActions() {
    console.log("⚙️ setupActions()");
    
    if (addGroupBtn) {
      console.log("✅ Botão +Grupo encontrado:", addGroupBtn.id);
      addGroupBtn.onclick = () => {
        console.log("🖱️ Clicou em +Grupo");
        openModal("create");
      };
    } else {
      console.error("❌ Botão addGroup NÃO encontrado!");
    }

    if (exportAllBtn) {
      exportAllBtn.onclick = () => {
        const cleanGroups = activeGroups.map(({ collapsed, source, ...rest }) => rest);
        const content = `/** Backup Consolidado **/\nwindow.GROUPS = ${JSON.stringify(cleanGroups, null, 2)};`;
        downloadFile("estudos-groups.js", content, "text/javascript");
      };
    }
    
    if (resetBtn) resetBtn.onclick = () => { 
      if (confirm("Restaurar padrão?\n\n⚠️ Isso apagará todas as customizações!")) { 
        localStorage.clear(); 
        window.location.reload(); 
      } 
    };
  }

  function render() {
    console.log("🎨 render() chamada");
    
    if (!groupsEl) {
      console.error("❌ groupsEl não encontrado!");
      return;
    }
    
    groupsEl.innerHTML = "";
    
    if (activeGroups.length === 0) {
      groupsEl.innerHTML = '<div style="text-align:center; padding:40px; color:#666;">Nenhum material encontrado</div>';
      return;
    }

    console.log(`📋 Renderizando ${activeGroups.length} grupos`);
    
    activeGroups.forEach((g, index) => {
      console.log(`  ${index + 1}. ${g.id} [${g.source || '?'}]`);
      
      const card = document.createElement("div");
      card.className = "card";
      card.id = `card-${g.id}`;  // ✅ ID único para cada card
      card.style.borderLeft = `5px solid ${g.color || "#8b86ff"}`;
      card.style.marginBottom = "15px";
      card.style.background = "#252535";
      card.style.borderRadius = "12px";
      
      // Badge de origem
      const sourceBadge = g.source === 'localStorage' ? '<span style="background:#22c55e; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px;">NOVO</span>' : '';

      // ✅ Lista ESCONDIDA por padrão (display: none)
      card.innerHTML = `
        <div class="head" style="padding:15px 20px; display:flex; align-items:center; gap:15px;">
          <span class="gicon-wrap" style="flex-shrink:0;">
            <a href="${g.iconHref || "#"}" target="_blank">
              <img class="gicon" src="${g.icon || ""}" style="width:64px; height:64px; object-fit:contain; border-radius:8px; background:#1a1a25; padding:4px;" onerror="this.style.display='none'">
            </a>
          </span>
          <h2 class="group-name" data-id="${g.id}" style="margin:0; font-size:18px; flex:1; cursor:pointer; color:#fff;" title="Clique para abrir/fechar as IAs">
            <span class="chip" style="width:8px; height:8px; border-radius:50%; background:${g.color || "#8b86ff"}; display:inline-block; margin-right:8px;"></span>
            ${g.name}
            ${sourceBadge}
          </h2>
          <div class="actions" style="display:flex; gap:8px;">
            <button class="btn btn-cover" data-id="${g.id}" style="font-size:12px; padding:8px 14px; background:#333; border-radius:6px;">📄 Capa</button>
            <button class="btn btn-edit" data-id="${g.id}" style="font-size:12px; padding:8px 14px; background:#444; border-radius:6px;">✏️ Editar</button>
            <button class="btn btn-export" data-id="${g.id}" style="font-size:12px; padding:8px 14px; background:#333; border-radius:6px;">💾</button>
          </div>
        </div>
        <div class="grid" id="grid-${g.id}" style="display:none; gap:5px; padding:0 20px 20px 20px;">
          ${(g.items || []).map((item) => `
            <div class="item" style="display:flex; align-items:center; gap:10px; padding:10px; background:#1a1a25; border-radius:8px;">
              <input type="checkbox" ${item.checked !== false ? "checked" : ""}>
              <div class="composite" style="flex:1; font-size:13px;">${item.code} | ${item.label}</div>
              <div class="urlbox" style="flex:2;">
                <input class="url" type="text" value="${item.url || ""}" style="width:100%; background:#111; color:#ccc; border:1px solid #333; padding:8px; border-radius:6px; font-size:12px;">
              </div>
              <a class="btn" href="${item.url || "#"}" target="_blank" style="font-size:11px; padding:8px 12px; border-radius:6px;">Abrir</a>
            </div>
          `).join('')}
        </div>
      `;

      // ✅ Botão Capa → abre a página de capa
      const coverBtn = card.querySelector(".btn-cover");
      if (coverBtn) {
        coverBtn.onclick = (e) => {
          e.stopPropagation();  // ✅ Impede propagação do clique
          console.log("📄 Clicou em Capa:", g.id);
          const cp = (typeof GROUP_COVER_PAGE !== "undefined") ? GROUP_COVER_PAGE : "estudos.html";
          window.open(`${cp}?group=${encodeURIComponent(g.id)}`, "_blank");
        };
      }

      // ✅ Botão Editar
      const editBtn = card.querySelector(".btn-edit");
      if (editBtn) {
        editBtn.onclick = (e) => {
          e.stopPropagation();
          console.log("✏️ Editando:", g.id);
          openModal("edit", g);
        };
      }
      
      // ✅ Botão Exportar
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

      // ✅ Clique no NOME → Toggle da lista de IAs
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
