// script.js
// ---------------- THEME TOGGLE ---------------------

const root = document.documentElement;
const saved = localStorage.getItem('theme') || 'dark';
root.setAttribute('data-theme', saved);

function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.textContent = saved === 'dark' ? '🌙' : '☀️';

  btn.onclick = () => {
    const current = root.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '🌙' : '☀️';
  };
}

document.addEventListener('DOMContentLoaded', setupThemeToggle);

// ---------------------------------------------------
//     OVERFLOW INTELIGENTE PARA OS BOTÕES
// ---------------------------------------------------

function adjustActions() {
  const actionBars = document.querySelectorAll(".launcher .actions");

  actionBars.forEach(actions => {
    // Remove qualquer estado antigo.
    actions.classList.remove("scrollable");

    // Se a largura do conteúdo for maior que a área visível:
    if (actions.scrollWidth > actions.clientWidth) {
      actions.classList.add("scrollable");
    }
  });
}

// Ajusta no carregamento e no redimensionamento
window.addEventListener("load", adjustActions);
window.addEventListener("resize", adjustActions);

// Como os cards podem ser recriados (script-launcher), observe mudanças no DOM
const observer = new MutationObserver(() => adjustActions());
observer.observe(document.body, { childList: true, subtree: true });
