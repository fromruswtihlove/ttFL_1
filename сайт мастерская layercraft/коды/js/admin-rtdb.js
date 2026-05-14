//console.log("admin-rtdb.js loaded");
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {getDatabase, ref, onValue, update} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "заглушка",
  authDomain: "заглушка",
  databaseURL: "заглушка",
  projectId: "заглушка",
  storageBucket: "заглушка",
  messagingSenderId: "заглушка",
  appId: "заглушка"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function esc(s){
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function starsText(n){
  const num = Math.max(1, Math.min(5, Number(n) || 5));
  return "★".repeat(num) + "☆".repeat(5 - num);
}

function renderList(el, itemsObj, isPending){
  el.innerHTML = "";
  const arr = Object.entries(itemsObj || {}).map(([id, v]) => ({ id, ...v }));
  arr.sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0));

  if(!arr.length){
    el.innerHTML = `<div class="reviewItem"><b>${isPending ? "Нет отзывов на модерации" : "Нет опубликованных отзывов"}</b></div>`;
    return;
  }

  for(const r of arr){
    const item = document.createElement("div");
    item.className = "reviewItem";

    const dt = r.createdAtMs ? new Date(r.createdAtMs).toLocaleString() : "";

    item.innerHTML = `
      <b>${esc(r.name)}</b>
      <div class="meta">${starsText(r.rating)} ${dt ? "• " + esc(dt) : ""}</div>
      <div style="margin-top:10px; line-height:1.55">${esc(r.text)}</div>
      ${r.photoDataUrl ? `<img alt="Фото к отзыву" src="${r.photoDataUrl}" style="margin-top:12px; width:100%; border-radius:14px; border:1px solid rgba(255,255,255,.12)"/>` : ""}
      <div class="badges" style="margin-top:12px">
        ${isPending ? `<button class="btn btnPrimary" data-approve="${r.id}">Одобрить</button>` : ""}
        <button class="btn btnGhost" data-delete="${r.id}">Удалить</button>
      </div>
    `;

    el.appendChild(item);

    const approveBtn = item.querySelector("[data-approve]");
    if(approveBtn){
      approveBtn.addEventListener("click", async ()=>{
        const id = approveBtn.getAttribute("data-approve");
        const updates = {};
        updates[`reviews/approved/${id}`] = {
          status: "approved",
          name: r.name || "",
          text: r.text || "",
          rating: Number(r.rating || 5),
          createdAtMs: Number(r.createdAtMs || Date.now()),
          photoDataUrl: r.photoDataUrl || ""
        };
        updates[`reviews/pending/${id}`] = null;

        try{
          await update(ref(db), updates);
        }catch(err){
          console.error("approve error:", err);
          alert("Ошибка одобрения: " + (err?.code || err?.message || String(err)));
        }
      });
    }

    const delBtn = item.querySelector("[data-delete]");
    delBtn.addEventListener("click", async ()=>{
      const id = delBtn.getAttribute("data-delete");
      const base = isPending ? "reviews/pending" : "reviews/approved";
      try{
        await update(ref(db), { [`${base}/${id}`]: null });
      }catch(err){
        console.error("delete error:", err);
        alert("Ошибка удаления: " + (err?.code || err?.message || String(err)));
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  const gate = document.getElementById("adminGate");
  const panel = document.getElementById("adminPanel");
  const loginForm = document.getElementById("adminLogin");
  const logoutBtn = document.getElementById("logoutBtn");
  const pendingEl = document.getElementById("pendingList");
  const approvedEl = document.getElementById("approvedAdminList");

  loginForm?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try{
      const email = loginForm.email.value.trim();
      const pass = loginForm.password.value;
      console.log("Login attempt:", email);
      await signInWithEmailAndPassword(auth, email, pass);
      console.log("Login OK");
    }catch(err){
      console.error("login error:", err);
      alert("Ошибка входа: " + (err?.code || err?.message || String(err)));
    }
  });

  logoutBtn?.addEventListener("click", ()=>signOut(auth));

  onAuthStateChanged(auth, (user)=>{
    if(!user){
      gate.style.display = "block";
      panel.style.display = "none";
      return;
    }

    gate.style.display = "none";
    panel.style.display = "block";

    onValue(ref(db, "reviews/pending"), (snap)=>{
      renderList(pendingEl, snap.val(), true);
    }, (err)=>console.error("pending read error:", err));

    onValue(ref(db, "reviews/approved"), (snap)=>{
      renderList(approvedEl, snap.val(), false);
    }, (err)=>console.error("approved read error:", err));
  });
});
