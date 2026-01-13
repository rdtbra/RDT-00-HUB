/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-launcher.js (CORRIGIDO: ID Obrigatório e Exato)
 * ============================================================
 */

(function () {
  if (typeof KEY === "undefined") return;

  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // --- Lógica de Prioridade e Sincronização ---
  async function getGroupData(g) {
    const id = g.id;
    // Prioridade 1: LocalStorage
    const localHeader = localStorage.getItem(`${KEY}:group:${id}`);
    const localItems = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${id}`);
    
    if (localHeader || localItems) {
      const header = localHeader ? JSON.parse(localHeader) : g;
      const items = localItems ? JSON.parse(localItems) : (g.items || []);
      return { ...header, items: Array.isArray(items) ? items : (items.items || []) };
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
          items: itemsData ? (Array.isArray(itemsData) ? itemsData : itemsData.items) : (g.items || [])
        };
      }
    } catch (e) {}

    // Prioridade 3: JS Original
    return g; 
  }

  // --- Helpers ---
  function downloadFile(filename, content, type = "text/javascript") {
    const blob = new Blob([content], { type: type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ✅ CORRIGIDO: Validação básica de slug (sem geração automática)
  function validateSlug(input) {
    const slug = (input || "").toString().trim();
    if (!slug) return null; // Vazio
    // Permite letras, números, hífen, underscore, ponto
    const valid = /^[a-zA-Z0-9][a-zA-Z0-9\-_.]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(slug);
    return valid ? slug : null;
  }

  // ✅ Verifica se ID já existe
  function isIdUnique(newId) {
    // Verifica nos grupos ativos
    const existsInActive = activeGroups.some(g => g.id === newId);
    if (existsInActive) return false;
    
    // Verifica no localStorage
    const keys = Object.keys(localStorage);
    const existsInLS = keys.some(k => k === `${KEY}:group:${newId}`);
    return !existsInLS;
  }

  // Feedback visual
  function showFeedback(msg, type = "info") {
    const feedback = document.createElement("div");
    feedback.style = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      border-radius: 8px;
      color: #fff;
      font-weight: bold;
      z-index: 10001;
      background: ${type === "error" ? "#ef4444" : "#22c55e"};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    feedback.innerText = msg;
    document.body.appendChild(feedback);
    setTimeout(() => {
      feedback.style.opacity = "0";
      feedback.style.transform = "translateX(100px)";
      setTimeout(() => feedback.remove(), 300);
    }, 3000);
  }

  // --- Inicialização ---
  let activeGroups = [];
  const groupsEl = document.getElementById("groups");
  const addGroupBtn = document.getElementById("addGroup") || document.getElementById("newGroup");
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
    const oldId = isEdit ? groupData.id : "";
    
    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
    const modal = document.createElement("div");
    modal.style = "background:var(--card-bg, #1e1e2e); padding:25px; border-radius:12px; width:100%; max-width:500px; border:1px solid #444; color:#fff; position:relative;";
    
    modal.innerHTML = `
      <button id="mCloseX" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#888; cursor:pointer; font-size:24px;">&times;</button>
      <h3 style="margin-top:0;">${isEdit ? "✏️ Editar Material" : "🚀 Novo Material"}</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label style="font-size:11px; color:#aaa;">NOME:</label>
        <input id="mName" type="text" value="${isEdit ? groupData.name : ""}" placeholder="Ex: EMT-04-QE - Quantum Esencial" style="padding:8px; background:#111; border:1px solid #444; color:#fff;">
        <label style="font-size:11px; color:#aaa;">ID (SLUG) - <span style="color:#ef4444;">OBRIGATÓRIO</span>:</label>
        <input id="mId" type="text" value="${oldId}" placeholder="Ex: emt-04-qe" style="padding:8px; background:#111; border:1px solid #444; color:#8b86ff;">
        <label style="font-size:11px; color:#aaa;">URL DO ÍCONE:</label>
        <input id="mIcon" type="text" value="${isEdit ? (groupData.icon || "") : ""}" placeholder="https://..." style="padding:8px; background:#111; border:1px solid #444; color:#fff;">
        <label style="font-size:11px; color:#aaa;">URL DO MATERIAL (REFERÊNCIA):</label>
        <input id="mIconHref" type="text" value="${isEdit ? (groupData.iconHref || "") : ""}" placeholder="https://drive.google.com/..." style="padding:8px; background:#111; border:1px solid #444; color:#fff;">
        <label style="font-size:11px; color:#aaa;">COR:</label>
        <input id="mColor" type="color" value="${isEdit ? (groupData.color || "#8b86ff") : "#8b86ff"}" style="width:100%; height:35px; background:none; border:none; cursor:pointer;">
      </div>
      <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
        <button id="mCancel" class="btn" style="background:#444;">Cancelar</button>
        <button id="mSave" class="btn" style="background:#8b86ff; font-weight:bold;">Salvar</button>
      </div>
      <div id="mError" style="color:#ef4444; font-size:12px; margin-top:10px; display:none;"></div>
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

      // ✅ CORRIGIDO: Validações
      errorDiv.style.display = "none";

      // Nome obrigatório
      if (!name) {
        errorDiv.innerText = "⚠️ O nome é obrigatório!";
        errorDiv.style.display = "block";
        return;
      }

      // ✅ ID obrigatório e exatamente como digitado
      if (!idInput) {
        errorDiv.innerText = "⚠️ O ID (slug) é obrigatório!";
        errorDiv.style.display = "block";
        return;
      }

      // ✅ Valida formato do ID (não pode começar ou terminar com hífen, etc)
      const newId = validateSlug(idInput);
      if (!newId) {
        errorDiv.innerText = "⚠️ ID inválido! Use apenas letras, números, hífen (-), underscore (_) e ponto (.).";
        errorDiv.style.display = "block";
        return;
      }

      // ✅ Verifica unicidade do ID
      if (newId !== oldId && !isIdUnique(newId)) {
        errorDiv.innerText = `⚠️ O ID "${newId}" já existe! Escolha outro.`;
        errorDiv.style.display = "block";
        return;
      }

      // Cria o objeto EXATAMENTE com os dados digitados
      const updatedData = {
        id: newId, // ✅ ID exato digitado pelo usuário
        name: name,
        color: color,
        icon: icon,
        iconHref: iconHref,
        collapsed: true,
        items: isEdit ? groupData.items : [] // Preserva itens se for edição
      };

      // Migração se ID mudou
      if (isEdit && oldId !== newId) {
        const items = localStorage.getItem(`ia-launcher-config:${APP_ID}:items:${oldId}`);
        if (items) {
          localStorage.setItem(`ia-launcher-config:${APP_ID}:items:${newId}`, items);
          localStorage.removeItem(`ia-launcher-config:${APP_ID}:items:${oldId}`);
        }
        localStorage.removeItem(`${KEY}:group:${oldId}`);
      }

      // Salva no localStorage
      localStorage.setItem(`${KEY}:group:${newId}`, JSON.stringify(updatedData));

      showFeedback(isEdit ? "✅ Material atualizado!" : "✅ Novo material criado!", "success");

      setTimeout(() => {
        overlay.remove();
        location.reload();
      }, 500);
    };

    document.getElementById("mCancel").onclick = () => overlay.remove();
    document.getElementById("mCloseX").onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  function setupActions() {
    if (addGroupBtn) {
      addGroupBtn.onclick = () => openModal("create");
    }

    if (exportAllBtn) {
      exportAllBtn.onclick = () => {
        const cleanGroups = activeGroups.map(({ collapsed, ...rest }) => rest);
        const content = `/** Backup Consolidado **/\nwindow.GROUPS = ${JSON.stringify(cleanGroups, null, 2)};`;
        downloadFile("estudos-groups.js", content, "text/javascript");
      };
    }
    
    if (resetBtn) resetBtn.onclick = () => { 
      if (confirm("Restaurar padrão?\n\n⚠️ Isso apagará todas as customizações!")) { 
        localStorage.clear(); 
        location.reload(); 
      } 
    };
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
            <button class="btn" data-act="export-disco">Exportar</button>
          </div>
        </div>
        <div class="grid" data-role="grid" style="display:none; gap:5px; padding:10px;"></div>
      `;

      card.querySelector("[data-act='edit-material']").onclick = () => openModal("edit", g);
      
      card.querySelector("[data-act='open-cover']").onclick = () => {
        const cp = (typeof GROUP_COVER_PAGE !== "undefined") ? GROUP_COVER_PAGE : "estudos.html";
        if (g.items && g.items.length > 0) {
          window.open(`${cp}?group=${encodeURIComponent(g.id)}`, "_blank");
        } else {
          showFeedback("⚠️ Este grupo não tem itens!", "error");
        }
      };
      
      card.querySelector("[data-act='export-disco']").onclick = () => {
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

      card.querySelector("[data-act='toggle']").onclick = () => {
        grid.style.display = grid.style.display === "none" ? "grid" : "none";
      };

      groupsEl.appendChild(card);
    });
  }

  // CSS animation
  if (!document.getElementById("feedback-styles")) {
    const style = document.createElement("style");
    style.id = "feedback-styles";
    style.innerHTML = `
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(100px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }

  init();
})();
