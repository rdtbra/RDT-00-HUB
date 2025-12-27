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

  const allGroups = Array.isArray(window.GROUPS) ? window.GROUPS : [];

  const titleEl = document.getElementById("coverTitle");
  const imgEl   = document.getElementById("coverImage");
  const linkEl  = document.getElementById("coverRefLink");
  const descEl  = document.getElementById("coverDescription");
  const iaList  = document.getElementById("iaList");

  if (!groupId) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    document.title = "Grupo não encontrado – Pessoal";
    return;
  }

  const group = allGroups.find(g => g.id === groupId);

  if (!group) {
    if (titleEl) titleEl.textContent = "Grupo não encontrado";
    document.title = "Grupo não encontrado – Pessoal";
    return;
  }

  // 🔘 Botão "Abrir todas" na capa
  const openAllBtn = document.getElementById("openAllCover");
  if (openAllBtn && Array.isArray(group.items)) {
    openAllBtn.addEventListener("click", () => {

      // 🔔 Feedback no título da aba
      document.title = `Abrindo recursos – ${group.name}`;

      const urls = group.items
        .filter(item => item && item.url)
        .map(item => item.url);

      if (!urls.length) {
        alert("Nenhuma URL configurada para este grupo.");
        document.title = `Pessoal – ${group.name}`;
        return;
      }

      urls.forEach(url => {
        try {
          window.open(url, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error("[COVER] Erro ao abrir URL:", url, e);
        }
      });

      // 🔄 Após abrir, volta o título normal
      setTimeout(() => {
        document.title = `Pessoal – ${group.name}`;
      }, 500);
    });
  }

  // 🏷️ Título, imagem, link
  if (titleEl) titleEl.textContent = group.name || group.id;
  document.title = `Pessoal – ${group.name || group.id}`;

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

  // 🤖 Lista de IAs
  if (iaList && Array.isArray(group.items)) {
    iaList.innerHTML = "";
    group.items.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.url}" target="_blank">${item.code} - ${item.label} • ${item.provider}</a>`;
      iaList.appendChild(li);
    });
  }
});
