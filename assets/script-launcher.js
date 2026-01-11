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
Exatamente. Esse é um ponto crucial: se você altera o ID no Launcher, a Capa (que depende desse ID via URL ?group=novo-id) pode "quebrar" ou perder o vínculo com os itens salvos anteriormente se não tomarmos cuidado.

Para que essa troca de ID seja segura e as alterações se propaguem corretamente, fiz dois ajustes importantes no código abaixo:

Migração Automática de Dados: Se você renomear um ID (ex: de old-id para new-id), o script agora tenta mover os itens salvos no localStorage da chave antiga para a nova.

Consistência de URL: O Launcher garante que, ao clicar em "Abrir Capa", você seja levado para a URL com o ID novo.

Aqui está o script-launcher.js atualizado com essa inteligência de migração:

JavaScript

/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-launcher.js
 * Função: Gerenciador com Migração de IDs e Sincronização
 * ============================================================
 */

(function () {
  if (typeof KEY === "undefined") {
    console.error("[launcher] Variável KEY não definida.");
    return;
  }

  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  const DEFAULT_GROUPS_SAFE = (function () {
    if (typeof DEFAULT_GROUPS !== "undefined" && Array.isArray(DEFAULT_GROUPS)) return DEFAULT_GROUPS;
    if (Array.isArray(window.GROUPS)) return window.GROUPS;
    return [];
  })();

  // --- Persistência e Sincronização ---

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      let loadedGroups = DEFAULT_GROUPS_SAFE;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) loadedGroups = parsed;
      }
      return syncItemsFromCovers(loadedGroups);
    } catch (e) {
      return DEFAULT_GROUPS_SAFE;
    }
  }

  function syncItemsFromCovers(allGroups) {
    return allGroups.map(g => {
      const coverKey = `ia-launcher-config:${APP_ID}:items:${g.id}`;
      const rawCoverItems = localStorage.getItem(coverKey);
      if (rawCoverItems) {
        try {
          const coverItems = JSON.parse(rawCoverItems);
          if (Array.isArray(coverItems)) return { ...g, items: coverItems };
        } catch (e) {}
      }
      return g;
    });
  }

  function save(groups) {
    try {
      localStorage.setItem(KEY, JSON.stringify(groups));
    } catch (e) {}
  }

  // --- FUNÇÃO DE MIGRAÇÃO DE ID (O Pulo do Gato para a Capa) ---
  function migrateCoverData(oldId, newId) {
    if (!oldId || !newId || oldId === newId) return;
    
    const oldKey = `ia-launcher-config:${APP_ID}:items:${oldId}`;
    const newKey = `ia-launcher-config:${APP_ID}:items:${newId}`;
    
    const data = localStorage.getItem(oldKey);
    if (data) {
      localStorage.setItem(newKey, data); // Copia dados para o novo ID
      localStorage.removeItem(oldKey);    // Remove rastro do antigo
      console.log(`[migração] Dados movidos de ${oldId} para ${newId}`);
    }
  }

  // --- Helpers ---

  function escapeHtml(str) {
    return (str || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  }

  function slugifyId(input) {
    return (input || "").toString().trim().toLowerCase()
      .replace(/\s+/g, "-").replace(/[^a-z0-9\-_.]/g, "")
      .replace(/\-+/g, "-").replace(/^\-|\-$/g, "");
  }

  let groups = load();

  function isIdAvailable(id, currentId = null) {
    if (id === currentId) return true;
    return !groups.some(g => (g.id || "") === id);
  }

  function makeUniqueId(base) {
    const b = slugifyId(base) || "grupo";
    if (isIdAvailable(b)) return b;
    for (let i = 2; i < 99; i++) {
      const candidate = `${b}-${i}`;
      if (isIdAvailable(candidate)) return candidate;
    }
    return `${b}-${Date.now()}`;
  }

  // --- Renderização ---

  const groupsEl = document.getElementById("groups");
  const delayEl = document.getElementById("delay");
  const addGroupBtn = document.getElementById("addGroup");

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
              <img class="gicon" src="${g.icon || ""}" alt="">
            </span>
            <span class="chip" style="background:${g.color || "#8b86ff"}"></span>
            ${escapeHtml(g.name || "Grupo")}
          </h2>
          <div class="actions">
            <button class="btn" data-act="open-cover">Abrir capa</button>          
            <button class="btn" data-act="open-group">Abrir todas</button>
            <button class="btn" data-act="edit-group">Editar</button>
            <button class="btn" data-act="remove-group">Remover</button>
          </div>
        </div>
        <div class="grid" data-role="grid" style="display:${g.collapsed ? "none" : "grid"}"></div>
      `;

      const grid = card.querySelector("[data-role='grid']");
      (g.items || []).forEach((item, ii) => {
        const row = document.createElement("div");
        row.className = "item";
        row.innerHTML = `
          <div class="left">
            <input class="checkbox" type="checkbox" ${item.checked !== false ? "checked" : ""}>
            <div class="composite">${escapeHtml([item.code, item.label].filter(Boolean).join(" | "))}</div>
          </div>
          <div class="urlbox"><input class="url" type="text" value="${item.url || ""}"></div>
          <div style="display:flex; gap:6px;"><a class="btn" href="${item.url || "#"}" target="_blank">Abrir</a></div>
        `;
        grid.appendChild(row);
      });

      card.querySelector("[data-act='open-cover']").onclick = () => {
        window.open(`${GROUP_COVER_PAGE}?group=${encodeURIComponent(g.id)}`, "_blank");
      };

      card.querySelector("[data-act='edit-group']").onclick = () => openGroupModal("edit", g);
      
      card.querySelector("[data-act='toggle']").onclick = () => {
        g.collapsed = !g.collapsed;
        save(groups);
        render();
      };

      groupsEl.appendChild(card);
    });
  }

  function openGroupModal(mode, groupData = null) {
    const isEdit = mode === "edit";
    const oldId = isEdit ? groupData.id : null;
    
    const overlay = document.createElement("div");
    overlay.style = "position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;";
    
    const modal = document.createElement("div");
    modal.style = "background:var(--card-bg, #1e1e2e); padding:25px; border-radius:12px; width:100%; max-width:400px; border:1px solid #444; color:#fff;";
    
    modal.innerHTML = `
      <h3>${isEdit ? "Editar Grupo" : "Novo Grupo"}</h3>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label>Nome:</label><input id="mName" type="text" value="${isEdit ? groupData.name : ""}" style="padding:8px; background:#111; color:#fff; border:1px solid #444;">
        <label>ID (Slug):</label><input id="mId" type="text" value="${isEdit ? groupData.id : ""}" style="padding:8px; background:#111; color:#aaa; border:1px solid #444;">
        <label>Cor:</label><input id="mColor" type="color" value="${isEdit ? groupData.color : "#8b86ff"}" style="width:100%;">
      </div>
      <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
        <button id="mCancel" class="btn">Cancelar</button>
        <button id="mSave" class="btn" style="background:#8b86ff">Salvar</button>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.appendChild(modal);

    const nameIn = document.getElementById("mName");
    const idIn = document.getElementById("mId");

    document.getElementById("mSave").onclick = () => {
      const newId = slugifyId(idIn.value);
      if (!isIdAvailable(newId, oldId)) return alert("ID em uso!");

      if (isEdit) {
        // Se o ID mudou, migra os dados da capa para não perder os itens salvos
        if (oldId !== newId) migrateCoverData(oldId, newId);
        
        groupData.name = nameIn.value;
        groupData.id = newId;
        groupData.color = document.getElementById("mColor").value;
      } else {
        groups.push({ id: newId, name: nameIn.value, color: document.getElementById("mColor").value, items: [] });
      }

      save(groups);
      render();
      overlay.remove();
    };

    document.getElementById("mCancel").onclick = () => overlay.remove();
  }

  if (addGroupBtn) addGroupBtn.onclick = () => openGroupModal("create");

  render();
})();