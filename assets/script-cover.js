/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js (CORREÇÃO DEFINITIVA DE NAVEGAÇÃO)
 * ============================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // --- 1. Sincronização de Identidade ---
  function loadGroupData() {
    const localHeader = localStorage.getItem(`ia-launcher-config:Estudos:group:${groupId}`);
    if (localHeader) return JSON.parse(localHeader);
    const groups = Array.isArray(window.GROUPS) ? window.GROUPS : [];
    return groups.find(g => g.id === groupId);
  }

  const group = loadGroupData();
  if (!groupId || !group) return;

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  // Aplicar Identidade Visual
  const titleEl = document.getElementById("coverTitle") || document.getElementById("groupTitle");
  const imgEl   = document.getElementById("coverImage") || document.getElementById("groupIcon");
  if (titleEl) {
    titleEl.textContent = group.name;
    titleEl.style.color = group.color || "#8b86ff";
  }
  if (imgEl) imgEl.src = group.icon || "";
  document.title = group.name || "Capa";

  // --- 2. Lógica de Itens ---
  const safeJsonParse = (str) => { try { return JSON.parse(str); } catch { return null; } };
  function loadItems() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    const items = raw ? safeJsonParse(raw) : group.items;
    return Array.isArray(items) ? items : (items?.items || []);
  }

  function renderIAList(items) {
    const iaList = document.getElementById("iaList");
    if (!iaList) return;
    iaList.innerHTML = "";
    items.forEach(item => {
      const li = document.createElement("li");
      li.className = "ia-item-row";
      li.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener">${item.code} - ${item.label}</a>`;
      iaList.appendChild(li);
    });
  }

  // --- 3. CORREÇÃO BRUTA: Interceptação de Eventos ---
  
  // Função mestre para abrir URLs sem deixar a página atual agir
  function forceOpen(e, url) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
    if (url && url !== "#" && url !== "") {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      alert("URL não encontrada ou inválida.");
    }
    return false;
  }

  // Seleção e Atribuição dos botões
  const btnOpenAll = document.getElementById("openAllCover");
  if (btnOpenAll) {
    btnOpenAll.addEventListener("click", (e) => {
      const items = loadItems();
      const urls = items.filter(it => it.url && it.url !== "#").map(it => it.url);
      if (urls.length === 0) return alert("Nenhuma URL disponível.");
      
      e.preventDefault();
      e.stopImmediatePropagation();
      
      urls.forEach((url, index) => {
        setTimeout(() => { window.open(url, "_blank", "noopener"); }, index * 300);
      });
    }, true); // O 'true' aqui captura o evento antes de qualquer outro comportamento
  }

  const btnRef = document.getElementById("openReference");
  if (btnRef) {
    btnRef.addEventListener("click", (e) => {
      const refUrl = group.iconHref || group.book || group.reference;
      forceOpen(e, refUrl);
    }, true);
  }

  // --- 4. Auxiliares e Editor Híbrido ---
  function createEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "onclick") el.onclick = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else el.setAttribute(k === "class" ? "class" : k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach(c => {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else if (c) el.appendChild(c);
    });
    return el;
  }

  window.openEditorModal = function() {
    const activeItems = loadItems();
    const overlay = createEl("div", { style: "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" });
    const modal = createEl("div", { style: "background:#1e1e2e;padding:25px;border-radius:12px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;border:1px solid #444;color:#fff;display:flex;flex-direction:column;gap:15px;" });

    modal.innerHTML = `<h3 style="margin:0">🛠️ Editor Híbrido: ${group.name}</h3>`;

    const inputRow = createEl("div", { style: "display:grid;grid-template-columns:80px 1fr 1fr 2fr 100px;gap:10px;background:#111;padding:15px;border-radius:8px;" });
    const inCode = createEl("input", { placeholder: "Cód", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    const inLabel = createEl("input", { placeholder: "Nome", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    const inProv = createEl("input", { placeholder: "Provider", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    const inUrl = createEl("input", { placeholder: "URL", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    
    const btnAdd = createEl("button", { class: "btn", style: "background:#8b86ff;", onclick: () => {
      if (!inUrl.value) return alert("URL necessária");
      const current = safeJsonParse(txtArea.value) || [];
      current.push({ code: inCode.value, label: inLabel.value, provider: inProv.value, url: inUrl.value, checked: true });
      txtArea.value = JSON.stringify(current, null, 2);
      inCode.value = ""; inLabel.value = ""; inUrl.value = "";
    }}, "➕ Inserir");

    inputRow.append(inCode, inLabel, inProv, inUrl, btnAdd);

    const txtArea = createEl("textarea", { id: "jsonEd", style: "width:100%;height:350px;background:#000;color:#8b86ff;font-family:monospace;padding:15px;border:1px solid #333;font-size:13px;" });
    txtArea.value = JSON.stringify(activeItems, null, 2);

    const footer = createEl("div", { style: "display:flex;justify-content:space-between;margin-top:10px;" }, [
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", { class: "btn", onclick: () => {
          const fin = createEl("input", { type: "file" });
          fin.onchange = ev => {
            const reader = new FileReader();
            reader.onload = () => txtArea.value = JSON.stringify(safeJsonParse(reader.result), null, 2);
            reader.readAsText(ev.target.files[0]);
          };
          fin.click();
        }}, "⬆️ Importar"),
        createEl("button", { class: "btn", onclick: () => {
          const blob = new Blob([txtArea.value], {type: "application/json"});
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${groupId}.items.json`; a.click();
        }}, "⬇️ Exportar")
      ]),
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", { class: "btn", style: "background:#444;", onclick: () => overlay.remove() }, "Cancelar"),
        createEl("button", { class: "btn", style: "background:#22c55e;font-weight:bold;", onclick: () => {
          const data = safeJsonParse(txtArea.value);
          if (!data) return alert("JSON inválido");
          localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(data));
          renderIAList(data);
          overlay.remove();
        }}, "💾 Salvar Local")
      ])
    ]);

    modal.append(inputRow, txtArea, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  // --- 5. Inicialização ---
  (async () => {
    const items = loadItems();
    renderIAList(items);
    
    const openAllBtnTrigger = document.getElementById("openAllCover");
    if (openAllBtnTrigger && !document.getElementById("editTeamBtn")) {
      const btn = createEl("button", { id: "editTeamBtn", class: "btn", style: "margin-left:10px;", onclick: openEditorModal }, "✏️ Editar itens");
      openAllBtnTrigger.insertAdjacentElement("afterend", btn);
    }
  })();
});