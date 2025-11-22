
// theme toggle
const root = document.documentElement;
const saved = localStorage.getItem('theme') || 'dark';
root.setAttribute('data-theme', saved);
const btn = document.getElementById('themeToggle');

if (btn) {
  btn.textContent = saved === 'dark' ? '🌙' : '☀️';
  btn.onclick = () => {
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    btn.textContent = next === 'dark' ? '🌙' : '☀️';
  };
}
