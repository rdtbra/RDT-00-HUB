
const root=document.documentElement;
const saved=localStorage.getItem('theme')||'dark';
root.setAttribute('data-theme',saved);
function setupThemeToggle(){
  const btn=document.getElementById('themeToggle');
  if(!btn)return;
  btn.textContent=saved==='dark'?'🌙':'☀️';
  btn.onclick=()=>{
    const current=root.getAttribute('data-theme')||'dark';
    const next=current==='dark'?'light':'dark';
    root.setAttribute('data-theme',next);
    localStorage.setItem('theme',next);
    btn.textContent=next==='dark'?'🌙':'☀️';
  };
}
document.addEventListener('DOMContentLoaded',setupThemeToggle);
