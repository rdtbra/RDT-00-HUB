
const root=document.documentElement;
const saved=localStorage.getItem('theme')||'dark';
root.setAttribute('data-theme',saved);
const btn=document.getElementById('themeToggle');
if(btn){
 btn.textContent=saved==='dark'?'🌙':'☀️';
 btn.onclick=()=>{const c=root.getAttribute('data-theme');const n=c==='dark'?'light':'dark';
 root.setAttribute('data-theme',n);localStorage.setItem('theme',n);btn.textContent=n==='dark'?'🌙':'☀️';};
}
