import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getDatabase,  ref,  push,  set,  query,  orderByChild,  limitToLast,  onValue,} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
/*const firebaseConfig = {
  apiKey: "заглушка",
  authDomain: "заглушка",
  databaseURL: "заглушка",
  projectId: "заглушка",
  storageBucket: "заглушка",
  messagingSenderId: "заглушка",
  appId: "заглушка"
};*/
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// === UTILS`EP ===
function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function starsText(n) {
  const num = Math.max(1, Math.min(5, Number(n) || 5));
  return "★".repeat(num) + "☆".repeat(5 - num);
}
function renderAvgStars(el, rating) {
  if (!el) return;
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  const pct = (r / 5) * 100;
  el.innerHTML = `<div class="avgWrap" style="position:relative; display:inline-block; font-size:18px; letter-spacing:2px; color:#e5e7eb;">★★★★★<div class="avgFill" style="position:absolute; left:0; top:0; overflow:hidden; white-space:nowrap; color:#f59e0b; width:${pct}%;">★★★★★</div></div>`;   //вставлено из <html>/<scss> - куска
}
function updateAvgRating(items) {
  const elScore = document.getElementById("homeAvgScore");
  const elStars = document.getElementById("homeAvgStars");
  const elMeta = document.getElementById("homeAvgMeta");
  if (!elScore || !elStars || !elMeta) return;
  const ratings = (items || [])
    .map((r) => Number(r.rating) || 0)
    .filter((n) => n >= 1 && n <= 5);
  const count = ratings.length;
  if (!count) {
    elScore.textContent = "0.0";
    renderAvgStars(elStars, 0);
    elMeta.textContent = "на основе 0 отзывов";
  } else {
    const avg = ratings.reduce((a, b) => a + b, 0) / count;
    elScore.textContent = avg.toFixed(1);
    renderAvgStars(elStars, avg);
    elMeta.textContent = `на основе ${count} отзывов`;
  }
}
function renderApproved(listEl, items) { //отзывы
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!items.length) {
    listEl.innerHTML = `<div style="padding:16px; background:var(--surface); border:1px solid var(--border); border-radius:12px; text-align:center; color:var(--text-secondary)">Пока нет опубликованных отзывов.</div>`;
    return;
  }
  for (const r of items) {
    const dt = r.createdAtMs ? new Date(r.createdAtMs).toLocaleDateString("ru-RU") : "";
    const el = document.createElement("div");
    el.className = "reviewItem";
    el.style.cssText = "padding:16px; background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column;";
    el.innerHTML = `
      <b>${esc(r.name)}</b>
      <div class="meta" style="color:#f59e0b; font-size:13px; margin:4px 0 8px">${starsText(r.rating)} ${dt ? "• " + dt : ""}</div>
      <div class="review-text-scroll" style="line-height:1.55; color:var(--text); margin-bottom:10px">${esc(r.text)}</div>
      ${r.photoDataUrl 
        ? `<img src="${esc(r.photoDataUrl)}" class="review-photo-thumb" style="width:100%; max-height:200px; object-fit:cover; border-radius:10px; cursor:pointer; display:block;">` 
        : ""}`;
    listEl.appendChild(el);
    const img = el.querySelector(".review-photo-thumb");
    if (img) {
      img.addEventListener("click", () => openImg(img.src));
    }
  }
}
function setupImageModal() {
  const imgBack = document.getElementById("imgModalBackdrop");
  const imgEl = document.getElementById("imgModalImg");
  const imgClose = document.getElementById("imgModalClose");
  function openImg(src) {
    if (!imgBack || !imgEl) return;
    imgEl.src = src;
    imgBack.classList.add("open");
    document.body.style.overflow = "hidden"; 
  }
  function closeImg() {
    if (!imgBack) return;
    imgBack.classList.remove("open");
    imgEl.src = "";
    document.body.style.overflow = ""; 
  }
  document.getElementById("approvedList")?.addEventListener("click", (e) => {
    const img = e.target?.closest?.("img.review-photo-thumb");
    if (img) openImg(img.src);
  });
  imgClose?.addEventListener("click", closeImg);
  imgBack?.addEventListener("click", (e) => {
    if (e.target === imgBack) closeImg();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeImg();
  });
  return { openImg, closeImg };
}

document.addEventListener("DOMContentLoaded", () => {
  setupImageModal();
  const form = document.getElementById("reviewForm");
  const ratingValue = document.getElementById("ratingValue");
  const starBtns = [...document.querySelectorAll("#ratingRow [data-star]")];
  let currentRating = 5;
  function paintStars(rating) {
    currentRating = rating;
    starBtns.forEach((b) =>
      b.classList.toggle("active", parseInt(b.dataset.star) <= rating)
    );
    if (ratingValue) ratingValue.textContent = rating;
  }
  starBtns.forEach((b) => {
    b.addEventListener("click", (e) => {
      e.preventDefault();
      paintStars(parseInt(b.dataset.star));
    });
    b.addEventListener("mouseenter", () =>
      starBtns.forEach((btn) =>
        btn.classList.toggle(
          "active",
          parseInt(btn.dataset.star) <= parseInt(b.dataset.star)
        )
      )
    );
    b.addEventListener("mouseleave", () => paintStars(currentRating));
  });
  paintStars(5);
  const approvedList = document.getElementById("approvedList");
  const q = query(
    ref(db, "reviews/approved"),
    orderByChild("createdAtMs"),
    limitToLast(100)
  );

  onValue(q, (snap) => {
    const val = snap.val() || {};
    const arr = Object.entries(val).map(([id, v]) => ({ id, ...v }));
    arr.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

    renderApproved(approvedList, arr);
    updateAvgRating(arr);
    console.log(`✅ Загружено ${arr.length} отзывов. Рейтинг пересчитан.`);
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const text = form.text.value.trim();
    const file = form.photo.files?.[0];

    if (!name || !text) {
      alert("Заполните имя и текст.");
      return;
    }

    let photo = "";
    if (file) {
      try {
        photo = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      } catch (err) {
        console.error("File read error:", err);
      }
    }

    try {
      await set(push(ref(db, "reviews/pending")), {
        status: "pending",
        name,
        text,
        rating: currentRating,
        createdAtMs: Date.now(),
        photoDataUrl: photo,
      });
      form.reset();
      paintStars(5);
      alert("Отзыв отправлен на модерацию. Спасибо!");
    } catch (err) {
      console.error("Submit error:", err);
      alert("Ошибка отправки: " + (err.message || err));
    }
  });
});