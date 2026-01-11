/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js (VERSÃO FINAL CONSOLIDADA)
 * ============================================================
 */
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // --- 1. Sincronização de Dados (Identidade do Grupo) ---
  function loadGroupData() {
    // Tenta primeiro o LocalStorage (edições feitas no Launcher)
    const localHeader = localStorage.getItem(`ia-launcher-config:Estudos:group:${groupId}`);
    if (localHeader) return JSON.parse(localHeader);
    
    // Fallback para window.GROUPS (Pessoalgroups.js / Estudogroups.js)
    const groups = Array.isArray(window.GROUPS) ? window.GROUPS : [];
    return groups.find(g => g.id === groupId);
  }

  const group = loadGroupData();
  if (!groupId || !group) {
    const t = document.getElementById("coverTitle") || document.getElementById("groupTitle");
    if (t) t.textContent = "Grupo não encontrado";
    return;
  }

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  // Elementos da UI principal
  const titleEl = document.getElementById("coverTitle") || document.getElementById("groupTitle");
  const imgEl   = document.getElementById("coverImage") || document.getElementById("groupIcon");
  const iaList  = document.getElementById("iaList");

  // Aplicar Identidade Visual (Nome e Cor)
  if (titleEl) {
    titleEl.textContent = group.name;
    titleEl.style.color = group.color || "#8b86ff";
  }
  if (imgEl) imgEl.src = group.icon || "";
  document.title = group.name || "Capa";

  // --- 2. Lógica de Gestão de Itens (IAs) ---
  const safeJsonParse = (str) => { try { return JSON.parse(str); } catch { return null; } };
  
  function loadItems() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    const items = raw ? safeJsonParse(raw) : group.items;
    return Array.isArray(items) ? items : (items?.items || []);
  }

  function renderIAList(items) {
    if (!iaList) return;
    iaList.innerHTML = "";
    if (!items.length) {
      iaList.innerHTML = "<li>Nenhum recurso configurado.</li>";
      return;
    }
    items.forEach(item => {
      const li = document.createElement("li");
      li.className = "ia-item-row";
      li.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.code} - ${item.label}</a>`;
      iaList.appendChild(li);
    });
  }

  // --- 3. CORREÇÃO: Ações dos Botões Específicos ---

  // Botão Abrir Todas as Abas
  const btnOpenAll = document.getElementById("openAllCover") || Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Abrir todas'));
  if (btnOpenAll) {
    btnOpenAll.onclick = (e) => {
      e.preventDefault();
      const items = loadItems();
      const urls = items.filter(it => it.url && it.url !== "#").map(it => it.url);
      
      if (urls.length === 0) return alert("Nenhuma URL válida encontrada na lista.");

      // Delay de 300ms entre aberturas para evitar bloqueio de pop-up do navegador
      urls.forEach((url, index) => {
        setTimeout(() => { window.open(url, "_blank", "noopener,noreferrer"); }, index * 300);
      });
    };
  }

  // Botão Abrir Material de Referência (Livro/Documento)
  const btnRef = document.getElementById("coverRefLink") || document.getElementById("openReference") || Array.from(document.querySelectorAll('a')).find(el => el.textContent.includes('material de referência'));
  if (btnRef) {
    btnRef.onclick = (e) => {
      // Prioriza iconHref (definido no launcher) ou campos alternativos de livro
      const refUrl = group.iconHref || group.book || group.reference;
      if (refUrl && refUrl !== "#") {
        window.open(refUrl, "_blank", "noopener,noreferrer");
      } else {
        e.preventDefault();
        alert("Nenhum material de referência (URL do livro) cadastrado para este grupo.");
      }
    };
  }

  // --- 4. Sistema Auxiliar de UI ---
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

  // --- 5. Editor Híbrido (Campos de Inserção + Edição JSON Direta) ---
  window.openEditorModal = function() {
    const activeItems = loadItems();
    const overlay = createEl("div", { style: "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;" });
    const modal = createEl("div", { style: "background:#1e1e2e;padding:25px;border-radius:12px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;border:1px solid #444;color:#fff;display:flex;flex-direction:column;gap:15px;" });

    modal.innerHTML = `<h3 style="margin:0">🛠️ Editor Híbrido: ${group.name}</h3>`;

    // Campos para inserção rápida
    const inputRow = createEl("div", { style: "display:grid;grid-template-columns:80px 1fr 1fr 2fr 100px;gap:10px;background:#111;padding:15px;border-radius:8px;" });
    const inCode = createEl("input", { placeholder: "Cód", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    const inLabel = createEl("input", { placeholder: "Nome", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    const inProv = createEl("input", { placeholder: "Provider", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    const inUrl = createEl("input", { placeholder: "URL", style: "background:#222;border:1px solid #444;color:#fff;padding:8px;" });
    
    const btnAdd = createEl("button", { class: "btn", style: "background:#8b86ff;", onclick: () => {
      if (!inUrl.value) return alert("A URL é obrigatória para inserir.");
      const current = safeJsonParse(txtArea.value) || [];
      current.push({ code: inCode.value || "M00", label: inLabel.value || "Novo Item", provider: inProv.value || "", url: inUrl.value, checked: true });
      txtArea.value = JSON.stringify(current, null, 2);
      inCode.value = ""; inLabel.value = ""; inUrl.value = "";
    }}, "➕ Inserir");

    inputRow.append(inCode, inLabel, inProv, inUrl, btnAdd);

    // Área de Texto JSON para controle total
    const txtArea = createEl("textarea", { id: "jsonEd", style: "width:100%;height:350px;background:#000;color:#8b86ff;font-family:monospace;padding:15px;border:1px solid #333;font-size:13px;resize:vertical;" });
    txtArea.value = JSON.stringify(activeItems, null, 2);

    const footer = createEl("div", { style: "display:flex;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:10px;" }, [
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", { class: "btn", onclick: () => {
          const fin = createEl("input", { type: "file", accept: ".json" });
          fin.onchange = e => {
            const reader = new FileReader();
            reader.onload = () => txtArea.value = JSON.stringify(safeJsonParse(reader.result), null, 2);
            reader.readAsText(e.target.files[0]);
          };
          fin.click();
        }}, "⬆️ Importar"),
        createEl("button", { class: "btn", onclick: () => {
          const content = JSON.stringify({ items: safeJsonParse(txtArea.value) }, null, 2);
          const blob = new Blob([content], {type: "application/json"});
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${groupId}.items.json`; a.click();
        }}, "⬇️ Exportar")
      ]),
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", { class: "btn", style: "background:#444;", onclick: () => overlay.remove() }, "Cancelar"),
        createEl("button", { class: "btn", style: "background:#22c55e;font-weight:bold;", onclick: () => {
          const data = safeJsonParse(txtArea.value);
          if (!data) return alert("JSON inválido!");
          localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(data));
          renderIAList(data);
          overlay.remove();
        }}, "💾 Salvar Alterações")
      ])
    ]);

    modal.append(inputRow, txtArea, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  // --- 6. Inicialização ---
  (async () => {
    const items = loadItems();
    renderIAList(items);
    
    // Inserir botão de edição ao lado do "Abrir todas as abas"
    const openBtnRef = document.getElementById("openAllCover") || Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Abrir todas'));
    if (openBtnRef && !document.getElementById("editTeamBtn")) {
      const btn = createEl("button", { id: "editTeamBtn", class: "btn", style: "margin-left:10px;", onclick: openEditorModal }, "✏️ Editar itens");
      openBtnRef.insertAdjacentElement("afterend", btn);
    }
  })();
});