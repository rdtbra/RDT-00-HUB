// Theme toggle with persistence
const root = document.documentElement;
const toggleBtn = document.getElementById('themeToggle');

// Load saved theme
const saved = localStorage.getItem('theme');
if (saved) {
  root.setAttribute('data-theme', saved);
  toggleBtn.textContent = saved === 'dark' ? '🌙' : '☀️';
}

toggleBtn.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  toggleBtn.textContent = next === 'dark' ? '🌙' : '☀️';
});