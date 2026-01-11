/**
 * ============================================================
 * RDT-00-HUB / HUB Pessoal
 * ------------------------------------------------------------
 * Arquivo: script-cover.js
 * Tipo: Cover Page Controller
 *
 * Função:
 * - Controla a página de capa dos grupos
 * - Carrega título, imagem, descrição e lista de recursos
 * - Gerencia abertura em massa de abas (Abrir todas)
 * - Atualiza dinamicamente o título da aba do navegador
 *
 * Contexto:
 * Sistema HUB profissional e pessoal para estudos,
 * desenvolvimento, análise de código e projetos diversos,
 * integrando múltiplos provedores de LLMs.
 *
 * Dependências:
 * - window.GROUPS (Pessoalgroups.js / Estudogroups.js)
 * - script.js (configurações globais / tema)
 *
 * Persistência:
 * - localStorage (configurações globais do HUB)
 *
 * Autor: RDT-00-HUB - Equipe
 * Supervisor: ChatGPT (SUP)
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");

  // ✅ Ajustáveis sem mexer no HTML:
  // - Se você definir window.LAUNCHER_APP_ID em algum lugar (ex.: script.js), ele será usado.
  // - Caso contrário, cai no default abaixo.
  const APP_ID = (window.LAUNCHER_APP_ID || "AI-EMT-Equipes").trim();

  // Prefixo do título da aba (ex.: "Pessoal", "Estudos", "Profissional").
  // Se não for definido, tenta inferir pelo path; fallback para "Pessoal".
  const TITLE_PREFIX = (() => {
    if (typeof window.LAUNCHER_TITLE_PREFIX === "string" && window.LAUNCHER_TITLE_PREFIX.trim()) {
      return window.LAUNCHER_TITLE_PREFIX.trim();
    }
    const p = (location.pathname || "").toLowerCase();
    if (p.includes("/estudos/")) return "Estudos";
    if (p.includes("/pessoal/")) return "Pessoal";
    if (p.includes("/profissional/")) return "Profissional";
    return "Pessoal";
  })();

  const allGroups = Array.isArray(window.GROUPS) ? window.GROUPS : [];

  const titleEl = document.getElementById("coverTitle");
  const imgEl   = document.getElementById("coverImage");
  const linkEl  = document.getElementById("coverRefLink");
  const descEl  = document.getElementById("coverDescription");
  const iaList  = document.getElementById("iaList");

  if (!groupId) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    document.title = `Grupo não encontrado – ${TITLE_PREFIX}`;
    return;
  }

  const group = allGroups.find(g => g.id === groupId);

  if (!group) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    document.title = `Grupo não encontrado – ${TITLE_PREFIX}`;
    return;
  }

  // =========================================
  //  Helpers (Option 3):
  //  1) localStorage override
  //  2) descriptions/<groupId>.items.json
  //  3) fallback: group.items (JS)
  // =========================================

  const LS_ITEMS_KEY = `ia-launcher-config:${APP_ID}:items:${groupId}`;

  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return null;

    // Mantém apenas estrutura mínima válida, sem quebrar caso falte campo.
    const norm = items
      .filter(it => it && typeof it === "object")
      .map(it => ({
        code: (it.code ?? "").toString(),
        label: (it.label ?? "").toString(),
        provider: (it.provider ?? "").toString(),
        url: (it.url ?? "").toString(),
        checked: (typeof it.checked === "boolean") ? it.checked : true,
        img: (it.img ?? "").toString(),
      }))
      .filter(it => it.url); // só itens que tenham URL

    return norm;
  }

  function loadItemsFromLocalStorage() {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse(raw);
    const norm = normalizeItems(parsed);
    return norm;
  }

  async function loadItemsFromJsonFile() {
    const path = `descriptions/${groupId}.items.json`;
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (!r.ok) return null;

      const data = await r.json();

      // Aceita dois formatos:
      // 1) { "items": [ ... ] }
      // 2) [ ... ]
      const candidate = Array.isArray(data) ? data : data?.items;
      const norm = normalizeItems(candidate);
      return norm;
    } catch {
      return null;
    }
  }

  function renderIAList(items) {
    if (!iaList) return;

    iaList.innerHTML = "";

    if (!Array.isArray(items) || !items.length) {
      const li = document.createElement("li");
      li.textContent = "Nenhum recurso configurado para este grupo.";
      iaList.appendChild(li);
      return;
    }

    items.forEach(item => {
      const li = document.createElement("li");
      const safeUrl = item.url.replace(/"/g, "&quot;");
      const safeText = `${item.code} - ${item.label} • ${item.provider}`;
      li.innerHTML = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      iaList.appendChild(li);
    });
  }

  function bindOpenAllButton(items) {
    const openAllBtn = document.getElementById("openAllCover");
    if (!openAllBtn) return;

    // Remove handlers anteriores (caso re-render em algum futuro)
    openAllBtn.replaceWith(openAllBtn.cloneNode(true));
    const newBtn = document.getElementById("openAllCover");
    if (!newBtn) return;

    newBtn.addEventListener("click", () => {
      document.title = `Abrindo recursos – ${group.name || group.id}`;

      const urls = (Array.isArray(items) ? items : [])
        // por padrão, abre os "checked". Se não existir checked, normalizeItems define true.
        .filter(it => it && it.url && it.checked !== false)
        .map(it => it.url);

      if (!urls.length) {
        alert("Nenhuma URL configurada para este grupo.");
        document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;
        return;
      }

      urls.forEach(url => {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("[COVER] Erro ao abrir URL:", url, e);
        }
      });

      setTimeout(() => {
        document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;
      }, 500);
    });
  }

  // 🏷️ Título, imagem, link (metadados do grupo)
  if (titleEl) titleEl.textContent = group.name || group.id;
  document.title = `${TITLE_PREFIX} – ${group.name || group.id}`;

  if (imgEl)  imgEl.src = group.icon || "";
  if (linkEl) linkEl.href = group.iconHref || "#";

  // 📄 Descrição vinda de TXT (se existir)
  if (descEl) {
    const descPath = `descriptions/${groupId}.txt`;
    fetch(descPath)
      .then(r => (r.ok ? r.text() : Promise.reject()))
      .then(text => {
        descEl.textContent = (text || "").trim() || "Nenhuma descrição disponível.";
      })
      .catch(() => {
        descEl.textContent = "Nenhuma descrição disponível.";
      });
  }

  // =========================================
  //  Load items using Option 3 priority
  // =========================================
  (async () => {
    // 1) LocalStorage override
    const lsItems = loadItemsFromLocalStorage();
    if (lsItems) {
      renderIAList(lsItems);
      bindOpenAllButton(lsItems);
      return;
    }

    // 2) JSON file override (descriptions/<groupId>.items.json)
    const fileItems = await loadItemsFromJsonFile();
    if (fileItems) {
      renderIAList(fileItems);
      bindOpenAllButton(fileItems);
      return;
    }

    // 3) Fallback to JS group.items (se existir)
    const fallback = normalizeItems(group.items) || [];
    renderIAList(fallback);
    bindOpenAllButton(fallback);
  })();
});
