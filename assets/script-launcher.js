/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-launcher.js (CORRIGIDO - Final)
 * 
 * Correções:
 * ✅ "Restaurar Padrão" marca itens como "afterReset: true"
 * ✅ Itens marcados NÃO voltam para a lista de itens
 * ✅ Contagem é mantida (itens aparecem como "não recuperáveis")
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
  
  const STORAGE_PREFIX = `ia-launcher-config:${APP_ID}`;

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

  // --- Sistema de Exclusão ---
  function getExcludedGroups() {
    try {
      const excluded = localStorage.getItem(`${STORAGE_PREFIX}:excludedGroups`);
      return excluded ? JSON.parse(excluded) : [];
    } catch (e) {
      return [];
    }
  }

  function saveExcludedGroups(groups) {
    localStorage.setItem(`${STORAGE_PREFIX}:excludedGroups`, JSON.stringify(groups));
  }

  function addExcludedGroup(groupId) {
    const excluded = getExcludedGroups();
    const updated = excluded.map(item => {
      if (typeof item === "string") {
        return { id: item, afterReset: true };
      }
      return { ...item, afterReset: true };
    });
    updated.push({ id: groupId, afterReset: false });
    saveExcludedGroups(updated);
    console.log(`🗑️ Marcado como excluído: ${groupId}`);
  }

  function removeExcludedGroup(groupId) {
    const excluded = getExcludedGroups();
    const filtered = excluded.filter(item => {
      const id = typeof item === "string" ? item : item.id;
      return id !== groupId;
    });
    saveExcludedGroups(filtered);
  }

  // ✅ CORRIGIDO: Marca todos como "afterReset: true" (não recuperáveis)
  function markAllAsAfterReset() {
    const excluded = getExcludedGroups();
    const marked = excluded.map(item => {
      const id = typeof item === "string" ? item : item.id;
      return { id: id, afterReset: true };
    });
    saveExcludedGroups(marked);
    console.log(`🔄 ${marked.length} itens marcados como "não recuperáveis"`);
  }

  function getLocalGroups() {
    const groups = [];
    const prefix = `${STORAGE_PREFIX}:group:`;
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.id) {
            groups.push(data);
          }
        } catch (e) {}
      }
    });
    
    return groups.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  async function getGroupData(g) {
    const id = g.id;
    
    const localHeader = localStorage.getItem(`${STORAGE_PREFIX}:group:${id}`);
    const localItems = localStorage.getItem(`${STORAGE_PREFIX}:items:${id}`);
    
    if (localHeader || localItems) {
      const header = localHeader ? JSON.parse(localHeader) : g;
      const items = localItems ? JSON.parse(localItems) : (g.items || []);
      return { 
        ...header, 
        items: Array.isArray(items) ? items : (items.items || []),
        source: 'localStorage'
      };
    }

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

    return { ...g, source: 'javascript' };
  }

  // --- Modal de Exclusão ---
  function openDeleteModal(groupData) {
    const groupId = groupData.id;
    const groupName = groupData.name;
    
    console.log("🗑️ Abrindo modal de exclusão:", groupId);

    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
    
    const modal = document.createElement("div");
    modal.style = "background:#1e1e2e; padding:30px; border-radius:16px; width:100%; max-width:450px; border:1px solid #ff4444; color:#fff; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.5);";
    
    modal.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:48px; margin-bottom:15px;">🗑️</div>
        <h2 style="margin:0 0 10px 0; color:#ff6666;">Excluir Material?</h2>
        <p style="color:#aaa; margin-bottom:25px;">
          Você está prestes a excluir:<br>
          <strong style="color:#fff; font-size:16px;">${groupName}</strong>
        </p>
        
        <div style="background:rgba(239,68,68,0.1); padding:15px; border-radius:8px; margin-bottom:25px; border-left:3px solid #ef4444;">
          <p style="margin:0; font-size:13px; color:#ff8888;">
            ⚠️ <strong>Esta ação é irreversível!</strong><br>
            O material será removido da visualização e não aparecerá na exportação.
          </p>
        </div>
        
        <div style="margin-bottom:20px;">
          <label style="font-size:12px; color:#8b86ff; font-weight:bold;">DIGITE "EXCLUIR" PARA CONFIRMAR</label>
          <input id="deleteConfirm" type="text" placeholder="EXCLUIR" style="
            width:100%; 
            padding:12px; 
            background:#0d0d0d; 
            border:2px solid #333; 
            color:#ff6666; 
            border-radius:8px; 
            font-size:16px; 
            font-weight:bold;
            text-align:center;
            text-transform:uppercase;
            box-sizing:border-box;
            margin-top:8px;
          ">
        </div>
        
        <div style="display:flex; gap:10px; justify-content:center;">
          <button id="deleteCancel" style="background:#333; padding:12px 24px; border-radius:8px; color:#fff; border:none; cursor:pointer;">Cancelar</button>
          <button id="deleteConfirmBtn" disabled style="background:#441111; border:1px solid #ff4444; padding:12px 24px; border-radius:8px; color:#666; cursor:not-allowed;">🗑️ Excluir</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    const input = document.getElementById("deleteConfirm");
    const confirmBtn = document.getElementById("deleteConfirmBtn");

    input.addEventListener("input", () => {
      const val = input.value.trim().toUpperCase();
      if (val === "EXCLUIR") {
        confirmBtn.disabled = false;
        confirmBtn.style.cursor = "pointer";
        confirmBtn.style.color = "#ff8888";
        confirmBtn.style.background = "#661111";
      } else {
        confirmBtn.disabled = true;
        confirmBtn.style.cursor = "not-allowed";
        confirmBtn.style.color = "#666";
        confirmBtn.style.background = "#441111";
      }
    });

    confirmBtn.onclick = () => {
      console.log("✅ Confirmed deletion:", groupId);
      
      localStorage.removeItem(`${STORAGE_PREFIX}:group:${groupId}`);
      localStorage.removeItem(`${STORAGE_PREFIX}:items:${groupId}`);
      
      addExcludedGroup(groupId);
      
      showFeedback("✅ Material excluído com sucesso!", "success");
      overlay.remove();
      
      setTimeout(() => { window.location.reload(); }, 1000);
    };

    document.getElementById("deleteCancel").onclick = () => overlay.remove();
  }

  // --- Modal de Restauração ---
  function openRestoreModal(excludedGroupsList) {
    console.log("♻️ Abrindo modal de restauração:", excludedGroupsList);

    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
    
    const modal = document.createElement("div");
    modal.style = "background:#1e1e2e; padding:30px; border-radius:16px; width:100%; max-width:550px; border:1px solid #22c55e; color:#fff; position:relative; box-shadow:0 20px 60px rgba(0,0,0,0.5); max-height:80vh; display:flex; flex-direction:column;";
    
    const groupsHtml = excludedGroupsList.map(g => `
      <div class="restore-item" data-id="${g.id}" style="
        display:flex; 
        align-items:center; 
        gap:12px;
        padding:12px; 
        background:#1a1a25; 
        border-radius:8px; 
        margin-bottom:8px;
        border:1px solid #333;
        cursor:pointer;
        transition:all 0.2s;
        ${g.afterReset ? 'opacity:0.5;' : ''}
      " onclick="event.target.tagName !== 'INPUT' && this.querySelector('input').click()">
        <input type="checkbox" class="restore-checkbox" data-id="${g.id}" 
          ${g.afterReset ? 'disabled' : ''} 
          style="width:20px; height:20px; cursor:pointer; flex-shrink:0;">
        <div style="flex:1;">
          <div style="font-weight:bold; color:#fff;">${g.name || g.id}</div>
          <div style="font-size:11px; color:#666;">ID: ${g.id}</div>
        </div>
        <span style="font-size:10px; padding:4px 8px; border-radius:4px; background:${g.afterReset ? 'rgba(239,68,68,0.2); color:#ff6666;' : 'rgba(34,197,94,0.2); color:#22c55e;'}; white-space:nowrap;">
          ${g.afterReset ? '⚠️ Não recuperável' : '✅ Recuperável'}
        </span>
      </div>
    `).join('');

    modal.innerHTML = `
      <button id="restoreClose" style="position:absolute; top:15px; right:15px; background:none; border:none; color:#666; cursor:pointer; font-size:28px; line-height:1;">&times;</button>
      
      <div style="text-align:center; margin-bottom:20px;">
        <div style="font-size:48px; margin-bottom:10px;">♻️</div>
        <h2 style="margin:0 0 5px 0; color:#22c55e;">Materiais Excluídos</h2>
        <p style="color:#aaa; font-size:14px;">Selecione os itens que deseja restaurar</p>
      </div>
      
      <div style="flex:1; overflow-y:auto; margin-bottom:20px; max-height:400px;">
        ${excludedGroupsList.length > 0 ? groupsHtml : '<p style="color:#666; text-align:center;">Nenhum material excluído</p>'}
      </div>
      
      <div style="background:rgba(34,197,94,0.1); padding:12px; border-radius:8px; margin-bottom:15px; border-left:3px solid #22c55e;">
        <p style="margin:0; font-size:12px; color:#88ff88;">💡 <strong>Dica:</strong> Selecione um ou mais itens para restaurar</p>
      </div>
      
      <div style="display:flex; gap:10px; justify-content:space-between; flex-wrap:wrap;">
        <button id="restoreSelectAll" style="background:#333; padding:10px 16px; border-radius:6px; color:#ccc; border:none; cursor:pointer; font-size:13px;">Selecionar Todos</button>
        
        <div style="display:flex; gap:10px;">
          <button id="restoreCloseBtn" style="background:#333; padding:10px 16px; border-radius:6px; color:#fff; border:none; cursor:pointer;">Fechar</button>
          <button id="restoreSelectedBtn" disabled style="background:#22c55e; padding:10px 20px; border-radius:6px; color:#fff; border:none; cursor:not-allowed; font-weight:bold; opacity:0.5;">♻️ Restaurar Selecionados</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    document.getElementById("restoreClose").onclick = overlay.remove;
    document.getElementById("restoreCloseBtn").onclick = overlay.remove;
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const checkboxes = modal.querySelectorAll(".restore-checkbox:not([disabled])");
    const selectAllBtn = document.getElementById("restoreSelectAll");
    const restoreBtn = document.getElementById("restoreSelectedBtn");
    
    selectAllBtn.onclick = () => {
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !allChecked);
      updateRestoreButton();
    };
    
    function updateRestoreButton() {
      const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
      restoreBtn.textContent = `♻️ Restaurar ${checked} Item(ns)`;
      restoreBtn.disabled = checked === 0;
      restoreBtn.style.cursor = checked > 0 ? "pointer" : "not-allowed";
      restoreBtn.style.opacity = checked > 0 ? "1" : "0.5";
    }
    
    checkboxes.forEach(cb => cb.onchange = updateRestoreButton);

    restoreBtn.onclick = () => {
      const checkedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.id);
      if (checkedIds.length === 0) return;
      
      console.log("♻️ Restaurando:", checkedIds);
      checkedIds.forEach(id => removeExcludedGroup(id));
      
      showFeedback(`✅ ${checkedIds.length} material(is) restaurado(s)!`, "success");
      
      setTimeout(() => { overlay.remove(); window.location.reload(); }, 1000);
    };
  }

  // --- FUNÇÃO DE RESTAURAR PADRÃO (COM CONFIRMAÇÃO) ---
  function performReset() {
    console.log("🔄 performReset() - Iniciando restauração de padrão");
    
    // Pergunta de confirmação
    const confirmacao = confirm(
      "⚠️ ATENÇÃO!\n\n" +
      "Tem certeza que deseja RESTAURAR O PADRÃO?\n\n" +
      "Isso irá:\n" +
      "• Remover TODAS as customizações\n" +
      "• Excluir todos os materiais criados por você\n" +
      "• Os materiais excluídos NÃO poderão mais ser restaurados\n\n" +
      "Esta ação NÃO pode ser desfeita!\n\n" +
      "Deseja continuar?"
    );
    
    if (!confirmacao) {
      console.log("❌ Usuário cancelou a restauração");
      return;
    }
    
    console.log("✅ Usuário confirmou - executando restauração...");
    
    // Remove todas as customizações do localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(`${STORAGE_PREFIX}:group:`) || 
          key.startsWith(`${STORAGE_PREFIX}:items:`)) {
        localStorage.removeItem(key);
      }
    });
    
    // ✅ MARCA TODOS OS EXCLUÍDOS COMO "afterReset: true"
    // Isso impede que eles voltem para a lista de itens
    markAllAsAfterReset();
    
    showFeedback("🔄 Padrão restaurado com sucesso!", "success");
    
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  // --- Criar botões AO LADO DO IMPORTAR ---
  function createButtonsNextToImport() {
    console.log("🔄 createButtonsNextToImport()");
    
    // Busca o botão Importar
    const importBtn = document.getElementById("import") || 
                      document.getElementById("importGroups") ||
                      document.querySelector('button[id*="import"]');
    
    if (!importBtn) {
      console.warn("⚠️ Botão Importar não encontrado!");
      return;
    }
    
    console.log("✅ Botão Importar encontrado:", importBtn.id);
    
    // Remove botões anteriores se existirem
    const existingReset = document.getElementById("resetNextToImport");
    const existingRestore = document.getElementById("restoreExcludedNextToImport");
    if (existingReset) existingReset.remove();
    if (existingRestore) existingRestore.remove();
    
    // Copia estilos do botão Importar
    const computedStyle = window.getComputedStyle(importBtn);
    
    // --- Botão Restaurar Padrão ---
    const resetBtn = document.createElement("button");
    resetBtn.id = "resetNextToImport";
    resetBtn.textContent = "🔄 Restaurar Padrão";
    resetBtn.style.cssText = `
      background: ${computedStyle.background || '#444'};
      color: ${computedStyle.color || '#fff'};
      border: ${computedStyle.border || '1px solid #555'};
      padding: ${computedStyle.padding || '10px 18px'};
      border-radius: ${computedStyle.borderRadius || '8px'};
      cursor: pointer;
      font-size: ${computedStyle.fontSize || '13px'};
      font-weight: ${computedStyle.fontWeight || 'normal'};
      font-family: ${computedStyle.fontFamily || 'inherit'};
      margin-left: 10px;
    `;
    resetBtn.onclick = performReset;
    
    // Insere após o Importar
    importBtn.parentNode.insertBefore(resetBtn, importBtn.nextSibling);
    console.log("✅ Botão Restaurar Padrão inserido");
    
    // --- Botão Restaurar Excluídos (se houver) ---
    const allExcluded = getExcludedGroups();
    const totalExcluded = allExcluded.length;
    
    if (totalExcluded > 0) {
      const restoreBtn = document.createElement("button");
      restoreBtn.id = "restoreExcludedNextToImport";
      restoreBtn.textContent = `♻️ Restaurar ${totalExcluded} Excluído(s)`;
      
      // Estilo discreto, igual ao Importar
      restoreBtn.style.cssText = `
        background: ${computedStyle.background || '#444'};
        color: ${computedStyle.color || '#fff'};
        border: ${computedStyle.border || '1px solid #555'};
        padding: ${computedStyle.padding || '10px 18px'};
        border-radius: ${computedStyle.borderRadius || '8px'};
        cursor: pointer;
        font-size: ${computedStyle.fontSize || '13px'};
        font-weight: ${computedStyle.fontWeight || 'normal'};
        font-family: ${computedStyle.fontFamily || 'inherit'};
        margin-left: 10px;
      `;
      
      restoreBtn.onclick = () => {
        const excludedGroups = getExcludedGroups();
        
        Promise.all(excludedGroups.map(async (item) => {
          const id = typeof item === "string" ? item : item.id;
          const afterReset = typeof item === "string" ? false : item.afterReset;
          
          const localHeader = localStorage.getItem(`${STORAGE_PREFIX}:group:${id}`);
          if (localHeader) {
            const data = JSON.parse(localHeader);
            return { id, name: data.name, afterReset };
          }
          
          const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
          const original = originalGroups.find(g => g.id === id);
          if (original) return { id, name: original.name, afterReset };
          
          return { id, name: id, afterReset };
        })).then(groups => openRestoreModal(groups));
      };
      
      // Insere após o botão Restaurar Padrão
      resetBtn.parentNode.insertBefore(restoreBtn, resetBtn.nextSibling);
      console.log("✅ Botão Restaurar Excluídos inserido");
    }
  }

  // --- Inicialização ---
  let activeGroups = [];
  const groupsEl = document.getElementById("groups");
  const addGroupBtn = document.getElementById("addGroup") || document.getElementById("newGroup");
  const exportAllBtn = document.getElementById("exportAll") || document.getElementById("export"); 
  const resetBtn = document.getElementById("reset");

  console.log("🎯 Elementos encontrados:", { groupsEl: !!groupsEl, addGroupBtn: !!addGroupBtn });

  async function init() {
    console.log("📋 init() chamada");
    
    const openAllGhost = document.getElementById("openAll") || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Abrir TUDO'));
    if (openAllGhost) {
      console.log("🗑️ Removendo botão ghost");
      openAllGhost.remove();
    }

    const originalGroups = (typeof DEFAULT_GROUPS !== "undefined") ? DEFAULT_GROUPS : (window.GROUPS || []);
    console.log(`📥 ${originalGroups.length} grupos do JS original`);

    const localGroups = getLocalGroups();
    console.log(`📥 ${localGroups.length} grupos do localStorage`);

    const maxOrderJS = originalGroups.reduce((max, g) => {
      const order = g.order !== undefined ? Number(g.order) : -1;
      return order > max ? order : max;
    }, 0);

    let nextOrder = maxOrderJS + 1;
    const numberedOriginalGroups = originalGroups.map(g => {
      if (g.order !== undefined) return g;
      const numbered = { ...g, order: nextOrder };
      nextOrder++;
      return numbered;
    });

    const allGroupsMap = new Map();
    numberedOriginalGroups.forEach(g => allGroupsMap.set(g.id, g));
    localGroups.forEach(g => allGroupsMap.set(g.id, g));
    let allGroups = Array.from(allGroupsMap.values());

    const allExcluded = getExcludedGroups();
    const excludedIds = allExcluded.map(item => typeof item === "string" ? item : item.id);
    
    if (excludedIds.length > 0) {
      allGroups = allGroups.filter(g => !excludedIds.includes(g.id));
    }

    activeGroups = await Promise.all(allGroups.map(g => getGroupData(g)));
    
    console.log(`✅ ${activeGroups.length} grupos carregados`);

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
      const name = document.getElementById("mName").value.trim();
      const idInput = document.getElementById("mId").value.trim();
      const icon = document.getElementById("mIcon").value.trim();
      const iconHref = document.getElementById("mIconHref").value.trim();
      const color = document.getElementById("mColor").value;
      const errorDiv = document.getElementById("mError");

      errorDiv.style.display = "none";

      if (!name || !idInput) {
        errorDiv.innerText = "⚠️ Preencha nome e ID!";
        errorDiv.style.display = "block";
        return;
      }

      const newId = validateSlug(idInput);
      if (!newId) {
        errorDiv.innerText = "⚠️ ID inválido! Use apenas letras, números, hífen (-), underscore (_) e ponto (.).";
        errorDiv.style.display = "block";
        return;
      }

      if (isEdit && oldId !== newId) {
        localStorage.removeItem(`${STORAGE_PREFIX}:group:${oldId}`);
        localStorage.removeItem(`${STORAGE_PREFIX}:items:${oldId}`);
        
        const allExcluded = getExcludedGroups();
        const index = allExcluded.findIndex(item => (typeof item === "string" ? item : item.id) === oldId);
        if (index !== -1) {
          allExcluded.splice(index, 1);
          saveExcludedGroups(allExcluded);
          addExcludedGroup(newId);
        }
      }

      const updatedData = {
        id: newId,
        name: name,
        color: color,
        icon: icon,
        iconHref: iconHref,
        collapsed: true,
        order: isEdit ? groupData.order : Date.now(),
        items: isEdit ? groupData.items : [{ code: "M01", label: "Nova IA", url: "", checked: true }]
      };

      localStorage.setItem(`${STORAGE_PREFIX}:group:${newId}`, JSON.stringify(updatedData));
      localStorage.setItem(`${STORAGE_PREFIX}:items:${newId}`, JSON.stringify(updatedData.items || []));

      const allExcluded = getExcludedGroups();
      const wasExcluded = allExcluded.some(item => (typeof item === "string" ? item : item.id) === newId);
      if (wasExcluded) removeExcludedGroup(newId);

      showFeedback("✅ Material salvo com sucesso!", "success");
      overlay.remove();
      
      setTimeout(() => { window.location.reload(); }, 1000);
    };

    document.getElementById("mCancel").onclick = () => overlay.remove();
    document.getElementById("mCloseX").onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function setupActions() {
    console.log("⚙️ setupActions()");
    
    // CRIA OS BOTÕES AO LADO DO IMPORTAR
    createButtonsNextToImport();
    
    if (addGroupBtn) {
      addGroupBtn.onclick = () => openModal("create");
    }

    if (exportAllBtn) {
      exportAllBtn.onclick = () => {
        const groupsWithOrder = activeGroups.map((g) => {
          const { collapsed, source, ...rest } = g;
          return { ...rest };
        });
        
        const content = `/** Backup Consolidado - ${new Date().toLocaleString()} **/
window.GROUPS = ${JSON.stringify(groupsWithOrder, null, 2)};`;
        
        downloadFile("estudos-groups.js", content, "text/javascript");
      };
    }
    
    // Oculta o botão original
    if (resetBtn) {
      resetBtn.style.display = "none";
    }
  }

  function render() {
    console.log("🎨 render() chamada");
    
    if (!groupsEl) {
      console.error("❌ groupsEl não encontrado!");
      return;
    }
    
    groupsEl.innerHTML = "";
    
    if (activeGroups.length === 0) {
      groupsEl.innerHTML += '<div style="text-align:center; padding:40px; color:#666;">Nenhum material encontrado</div>';
      return;
    }

    console.log(`📋 Renderizando ${activeGroups.length} grupos`);
    
    activeGroups.forEach((g) => {
      const card = document.createElement("div");
      card.className = "card";
      card.id = `card-${g.id}`;
      card.style.borderLeft = `5px solid ${g.color || "#8b86ff"}`;
      card.style.marginBottom = "15px";
      card.style.background = "#252535";
      card.style.borderRadius = "12px";
      
      card.innerHTML = `
        <div class="head" style="padding:15px 20px; display:flex; align-items:center; gap:15px;">
          <span class="gicon-wrap" style="flex-shrink:0;">
            <a href="${g.iconHref || "#"}" target="_blank">
              <img class="gicon" src="${g.icon || ""}" style="width:64px; height:64px; object-fit:contain; border-radius:8px; background:#1a1a25; padding:4px;" onerror="this.style.display='none'">
            </a>
          </span>
          <h2 class="group-name" data-id="${g.id}" style="margin:0; flex:1; cursor:pointer; color:#fff; display:flex; flex-direction:column;" title="Clique para abrir/fechar as IAs">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="chip" style="width:8px; height:8px; border-radius:50%; background:${g.color || "#8b86ff"};"></span>
              <span style="font-size:18px;">${g.name}</span>
            </div>
            ${g.order ? `<span style="color:#666; font-size:12px; margin-left:16px; margin-top:2px;">#${g.order}</span>` : ''}
          </h2>
          <div class="actions" style="display:flex; gap:8px;">
            <button class="btn btn-cover" data-id="${g.id}" style="font-size:12px; padding:8px 14px; background:#333; border-radius:6px;">📄 Capa</button>
            <button class="btn btn-edit" data-id="${g.id}" style="font-size:12px; padding:8px 14px; background:#444; border-radius:6px;">✏️ Editar</button>
            <button class="btn btn-export" data-id="${g.id}" style="font-size:12px; padding:8px 14px; background:#333; border-radius:6px;">💾</button>
            <button class="btn btn-delete" data-id="${g.id}" data-name="${g.name}" style="font-size:12px; padding:8px 14px; background:#331111; border:1px solid #ff4444; border-radius:6px; color:#ff6666;">🗑️</button>
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

      card.querySelector(".btn-cover")?.addEventListener("click", (e) => {
        e.stopPropagation();
        const cp = (typeof GROUP_COVER_PAGE !== "undefined") ? GROUP_COVER_PAGE : "estudos.html";
        window.open(`${cp}?group=${encodeURIComponent(g.id)}`, "_blank");
      });

      card.querySelector(".btn-edit")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openModal("edit", g);
      });
      
      card.querySelector(".btn-export")?.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadFile(`${g.id}.group.json`, JSON.stringify({ id: g.id, name: g.name, color: g.color, icon: g.icon, iconHref: g.iconHref }, null, 2));
        downloadFile(`${g.id}.items.json`, JSON.stringify({ items: g.items || [] }, null, 2));
        showFeedback("✅ Arquivos exportados!", "success");
      });

      card.querySelector(".btn-delete")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteModal(g);
      });

      card.querySelector(".group-name")?.addEventListener("click", () => {
        const grid = card.querySelector(".grid");
        if (grid) {
          grid.style.display = grid.style.display === "none" ? "grid" : "none";
        }
      });

      groupsEl.appendChild(card);
    });
  }

  if (!document.getElementById("feedback-styles")) {
    const style = document.createElement("style");
    style.id = "feedback-styles";
    style.innerHTML = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
      }
      .group-name:hover { opacity: 0.8; }
      .group-name:active { opacity: 0.6; }
      .btn-delete:hover { background: #441111 !important; color: #ff8888 !important; }
      .restore-item:hover { border-color: #22c55e !important; background: #1f1f30 !important; }
    `;
    document.head.appendChild(style);
  }

  console.log("✅ script-launcher.js carregado completamente");
  init();
})();
