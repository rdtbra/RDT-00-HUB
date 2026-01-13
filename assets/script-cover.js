document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // -----------------------------------------------------------------
  // 1️⃣ Sincronização de Identidade
  // -----------------------------------------------------------------
  function loadGroupData() {
    const localHeader = localStorage.getItem(`ia-launcher-config:Estudos:group:${groupId}`);
    if (localHeader) return JSON.parse(localHeader);
    const groups = Array.isArray(window.GROUPS) ? window.GROUPS : [];
    return groups.find(g => g.id === groupId);
  }

  const group = loadGroupData();
  if (!groupId || !group) return;

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;
  const LS_DESC_KEY = `ia-launcher-config:${APP_ID}:desc:${groupId}`;

  // -----------------------------------------------------------------
  // 2️⃣ Elementos da Interface
  // -----------------------------------------------------------------
  const titleEl = document.getElementById("coverTitle") || document.getElementById("groupTitle");
  const imgEl = document.getElementById("coverImage") || document.getElementById("groupIcon");
  const descCont = document.getElementById("coverDescription") || document.getElementById("groupDescription");
  const iaList = document.getElementById("iaList");

  if (titleEl) {
    titleEl.textContent = group.name;
    titleEl.style.color = group.color || "#8b86ff";
  }
  if (imgEl) imgEl.src = group.icon || "";
  document.title = group.name || "Capa";

  // -----------------------------------------------------------------
  // 3️⃣ Lógica de Itens e Descrição
  // -----------------------------------------------------------------
  const safeJsonParse = (str) => { try { return JSON.parse(str); } catch { return null; } };

  function loadItems() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    const items = raw ? safeJsonParse(raw) : group.items;
    return Array.isArray(items) ? items : (items?.items || []);
  }

  function renderIAList(items) {
    if (!iaList) return;
    iaList.innerHTML = "";
    items.forEach(item => {
      const li = document.createElement("li");
      li.className = "ia-item-row";
      li.innerHTML = `<a href="${item.url}" target="_blank" rel="noopener">${item.code} - ${item.label}</a>`;
      iaList.appendChild(li);
    });
  }

  async function loadDescription() {
    if (!descCont) return;
    const localDesc = localStorage.getItem(LS_DESC_KEY);
    if (localDesc) {
      descCont.innerText = localDesc;
      return;
    }
    try {
      const resp = await fetch(`descriptions/${groupId}.txt`);
      if (resp.ok) descCont.innerText = await resp.text();
      else descCont.innerText = "Nenhuma descrição disponível.";
    } catch (_) {
      descCont.innerText = "Erro ao carregar descrição.";
    }
  }

  // -----------------------------------------------------------------
  // 4️⃣ Eventos de Botões – ABRIR TODAS AS ABA(S)
  // -----------------------------------------------------------------
  const btnOpenAll = document.getElementById("openAllCover");
  if (btnOpenAll) {
    btnOpenAll.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const items = loadItems();
      const urls = items.filter(it => it.url && it.url !== "#").map(it => it.url);
      if (urls.length === 0) return alert("Nenhuma URL disponível.");
      urls.forEach((url, i) => setTimeout(() => window.open(url, "_blank", "noopener"), i * 300));
    }, true);
  }

  // -----------------------------------------------------------------
  // 5️⃣ Evento de Botão – ABRIR MATERIAL DE REFERÊNCIA
  // -----------------------------------------------------------------
  const btnRef = document.getElementById("openReference");
  if (btnRef) {
    btnRef.addEventListener("click", async function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      // 1️⃣ Busca o link da forma mais robusta possível
      let refUrl = null;

      // a) Primeiro: tenta ler de localStorage (caso tenha sido salvo na página de cadastro)
      const lsRef = localStorage.getItem(`ia-launcher-config:${APP_ID}:ref:${groupId}`);
      if (lsRef) refUrl = lsRef;

      // b) Se não houver no LS, verifica as propriedades do objeto group
      if (!refUrl) refUrl = group.iconHref || group.book || group.reference || null;

      // c) Como fallback, procura por atributo data-ref no próprio botão
      if (!refUrl && btnRef.dataset.ref) refUrl = btnRef.dataset.ref;

      // -------------------------------------------------
      // 2️⃣ Validação
      // -------------------------------------------------
      if (!refUrl || refUrl.trim() === "" || refUrl === "#") {
        alert("Nenhum material de referência cadastrado para este grupo.");
        return;
      }

      // -------------------------------------------------
      // 3️⃣ Abrir em nova aba (seguro)
      // -------------------------------------------------
      window.open(refUrl, "_blank", "noopener,noreferrer");
    }, true);
  }

  // -----------------------------------------------------------------
  // 6️⃣ Utilitários de UI
  // -----------------------------------------------------------------
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

  // -----------------------------------------------------------------
  // 7️⃣ Editor de Descrição (preservado)
  // -----------------------------------------------------------------
  window.openDescEditor = function () {
    const currentDesc = descCont ? descCont.innerText : "";
    const overlay = createEl("div", {
      style: "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;"
    });
    const modal = createEl("div", {
      style: "background:#1e1e2e;padding:25px;border-radius:12px;width:100%;max-width:700px;border:1px solid #444;color:#fff;display:flex;flex-direction:column;gap:15px;"
    });
    modal.innerHTML = `<h3 style="margin:0">📝 Editar Descrição (TXT)</h3>`;
    const txtArea = createEl("textarea", {
      style: "width:100%;height:300px;background:#000;color:#ccc;font-family:serif;padding:15px;border:1px solid #333;font-size:16px;line-height:1.5;"
    });
    txtArea.value = currentDesc === "Nenhuma descrição disponível." ? "" : currentDesc;
    const footer = createEl("div", {
      style: "display:flex;justify-content:space-between;"
    }, [
      createEl("button", {
        class: "btn",
        onclick: () => {
          const blob = new Blob([txtArea.value], { type: "text/plain" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${groupId}.txt`;
          a.click();
        }
      }, "⬇️ Exportar TXT"),
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", {
          class: "btn",
          style: "background:#444;",
          onclick: () => overlay.remove()
        }, "Cancelar"),
        createEl("button", {
          class: "btn",
          style: "background:#22c55e;font-weight:bold;",
          onclick: () => {
            localStorage.setItem(LS_DESC_KEY, txtArea.value);
            if (descCont) descCont.innerText = txtArea.value;
            overlay.remove();
          }
        }, "💾 Salvar Local")
      ])
    ]);
    modal.append(txtArea, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  // -----------------------------------------------------------------
  // 8️⃣ Editor híbrido de itens (preservado)
  // -----------------------------------------------------------------
  window.openEditorModal = function () {
    const activeItems = loadItems();
    const overlay = createEl("div", {
      style: "position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;"
    });
    const modal = createEl("div", {
      style: "background:#1e1e2e;padding:25px;border-radius:12px;width:100%;max-width:900px;max-height:90vh;overflow-y:auto;border:1px solid #444;color:#fff;display:flex;flex-direction:column;gap:15px;"
    });
    modal.innerHTML = `<h3 style="margin:0">🛠️ Editor de Itens: ${group.name}</h3>`;
    const inputRow = createEl("div", {
      style: "display:grid;grid-template-columns:80px 1fr 1fr 2fr 100px;gap:10px;background:#111;padding:15px;border-radius:8px;"
    });
    const inCode = createEl("input", { placeholder: "Cód" });
    const inLabel = createEl("input", { placeholder: "Nome" });
    const inProv = createEl("input", { placeholder: "Provider" });
    const inUrl = createEl("input", { placeholder: "URL" });
    const btnAdd = createEl("button", {
      class: "btn",
      style: "background:#8b86ff;",
      onclick: () => {
        const current = safeJsonParse(txtArea.value) || [];
        current.push({ code: inCode.value, label: inLabel.value, provider: inProv.value, url: inUrl.value, checked: true });
        txtArea.value = JSON.stringify(current, null, 2);
      }
    }, "➕ Inserir");
    inputRow.append(inCode, inLabel, inProv, inUrl, btnAdd);
    const txtArea = createEl("textarea", {
      id: "jsonEd",
      style: "width:100%;height:350px;background:#000;color:#8b86ff;font-family:monospace;padding:15px;"
    });
    txtArea.value = JSON.stringify(activeItems, null, 2);
    const footer = createEl("div", {
      style: "display:flex;justify-content:space-between;margin-top:10px;"
    }, [
      createEl("button", {
        class: "btn",
        onclick: () => {
          const blob = new Blob([txtArea.value], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `${groupId}.items.json`;
          a.click();
        }
      }, "⬇️ Exportar JSON"),
      createEl("div", { style: "display:flex;gap:10px;" }, [
        createEl("button", {
          class: "btn",
          style: "background:#444;",
          onclick: () => overlay.remove()
        }, "Cancelar"),
        createEl("button", {
          class: "btn",
          style: "background:#22c55e;font-weight:bold;",
          onclick: () => {
            localStorage.setItem(LS_ITEMS_KEY, txtArea.value);
            renderIAList(safeJsonParse(txtArea.value));
            overlay.remove();
          }
        }, "💾 Salvar Local")
      ])
    ]);
    modal.append(inputRow, txtArea, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  // -----------------------------------------------------------------
  // 9️⃣ Inicialização
  // -----------------------------------------------------------------
  (async () => {
    const items = loadItems();
    renderIAList(items);
    
    await loadDescription();

    const openAllBtnTrigger = document.getElementById("openAllCover");
    if (openAllBtnTrigger && !document.getElementById("editTeamBtn")) {
      const btnItems = createEl("button", {
        id: "editTeamBtn",
        class: "btn",
        style: "margin-left:10px;",
        onclick: openEditorModal
      }, "✏️ Editar itens");
      const btnDesc = createEl("button", {
        id: "editDescBtn",
        class: "btn",
        style: "margin-left:10px;background:#444;",
        onclick: openDescEditor
      }, "📝 Editar Descrição");
      openAllBtnTrigger.insertAdjacentElement("afterend", btnItems);
      btnItems.insertAdjacentElement("afterend", btnDesc);
    }
  })();
});
