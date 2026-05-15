import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getDatabase, ref, query, orderByChild, limitToLast, onValue } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "заглушка",
  authDomain: "заглушка",
  databaseURL: "заглушка",
  projectId: "заглушка",
  storageBucket: "заглушка",
  messagingSenderId: "заглушка",
  appId: "заглушка"
};const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function esc(s){ return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function starsText(n){ const num = Math.max(1, Math.min(5, Number(n) || 5)); return "★".repeat(num) + "☆".repeat(5 - num); }
function renderAvgStars(el, rating){
  if (!el) return;
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const pct = (r / 5) * 100;

  el.innerHTML = `<div class="avgWrap" style="position:relative; display:inline-block; font-size:18px; line-height:1; letter-spacing:2px; color:#e5e7eb;">★★★★★<div class="avgFill" style="position:absolute; left:0; top:0; overflow:hidden; white-space:nowrap; color:#f59e0b; width:${pct}%;">★★★★★</div></div>`; //очень длинная строчка куска из html
}

function updateAvgRating(items){
  const elScore = document.getElementById("homeAvgScore");
  const elStars = document.getElementById("homeAvgStars");
  const elMeta  = document.getElementById("homeAvgMeta");
  if (!elScore || !elStars || !elMeta) return;
  const ratings = (items || []).map(r => Number(r.rating) || 0).filter(n => n >= 1 && n <= 5);
  const count = ratings.length;
  if (!count) {
    elScore.textContent = "0.0";
    renderAvgStars(elStars, 0);
    elMeta.textContent = "на основе 0 отзывов";
  } else {
    const avg = ratings.reduce((a,b)=>a+b,0) / count;
    elScore.textContent = avg.toFixed(1);
    renderAvgStars(elStars, avg);
    elMeta.textContent = `на основе ${count} отзывов`;
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  const root = document.getElementById("homeReviews");
  const track = document.getElementById("homeReviewsTrack");
  if(!root || !track) return;
  const imgBackdrop = document.getElementById("imgModalBackdrop");
  const imgEl = document.getElementById("imgModalImg");
  const imgClose = document.getElementById("imgModalClose");
  function openImg(src){ if(!imgBackdrop || !imgEl) return; imgEl.src = src; imgBackdrop.classList.add("open"); stop(); }
  function closeImg(){ if(!imgBackdrop) return; imgBackdrop.classList.remove("open"); imgEl.src = ""; }
  track.addEventListener("click", (e) => { const img = e.target?.closest?.("img"); if(img) openImg(img.src); });
  imgClose?.addEventListener("click", closeImg);
  imgBackdrop?.addEventListener("click", (e) => { if(e.target === imgBackdrop) closeImg(); });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeImg(); });
  let items = [];
  let index = 0;
  let timer = null;
  function getCardWidth(){
    const first = track.querySelector(".homeReviewCard");
    if(!first) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    return first.offsetWidth + gap;
  }
  function render(){
  track.innerHTML = "";
  if(!items.length){
    track.innerHTML = `<div class="homeReviewCard"><b>Пока нет отзывов.</b><div class="meta">Они появятся здесь после модерации.</div></div>`;
    index = 0; apply(); return;
  }
  for(const r of items){
    const dt = r.createdAtMs ? new Date(r.createdAtMs).toLocaleDateString('ru-RU') : "";
    const el = document.createElement("div");
    el.className = "homeReviewCard";
    el.innerHTML = `
      <b>${esc(r.name)}</b>
      <div class="meta">${starsText(r.rating)} ${dt ? '• '+dt : ''}</div>
      <div class="homeReviewBody">${esc(r.text)}</div>
      ${r.photoDataUrl ? `<img src="${r.photoDataUrl}" class="review-photo-thumb" style="margin-top:8px; width:100%; max-height:80px; object-fit:cover; border-radius:8px; cursor:pointer;">` : ''}
      ${r.reply ? `<div class="homeReviewReply"><b>Ответ:</b><br>${esc(r.reply)}</div>` : ''}
    `;
    track.appendChild(el);
    const img = el.querySelector('.review-photo-thumb');
    if(img) img.addEventListener('click', () => openImg(img.src));
  }
  index = 0;
  requestAnimationFrame(() => apply());
}
  function apply(){
    const w = getCardWidth();
    if(w > 0) track.style.transform = `translateX(${-index * w}px)`;
  }
  function next(){
    if(!items.length) return;
    index = (index + 1) % items.length; // Зацикливание в начало
    apply();
  }
  function prev(){
    if(!items.length) return;
    index = (index - 1 + items.length) % items.length; // Зацикливание в конец
    apply();
  }
  function start(){ stop(); root.classList.remove('paused'); timer = setInterval(next, 3000); }
  function stop(){ if(timer) clearInterval(timer); timer = null; root.classList.add('paused'); }
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.querySelector("[data-next]")?.addEventListener("click", ()=>{ stop(); next(); });
  root.querySelector("[data-prev]")?.addEventListener("click", ()=>{ stop(); prev(); });
  window.addEventListener("resize", ()=> requestAnimationFrame(apply));
  const q = query(ref(db, "reviews/approved"), orderByChild("createdAtMs"), limitToLast(200));
  onValue(q, (snap)=>{
    const val = snap.val() || {};
    items = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    items.sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0));
    render();
    start();
    updateAvgRating(items);
  });
});