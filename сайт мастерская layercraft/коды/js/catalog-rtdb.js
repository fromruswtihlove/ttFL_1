// catalog-rtdb.js — ИСПРАВЛЕННАЯ ВЕРСИЯ
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  equalTo,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

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
const db = getDatabase(app);

const OZON_FALLBACK = "https://www.ozon.ru/seller/layercraft-3144581/";
const AVITO_FALLBACK = "https://www.avito.ru/";

function escapeHtml(str) {
  const s = String(str ?? "");
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ===== Modal =====
let modalImages = [];
let modalIndex = 0;

function isOpen() {
  return document.getElementById("modalBackdrop")?.classList.contains("open");
}

function closeModal() {
  document.getElementById("modalBackdrop")?.classList.remove("open");
}

function renderModalGallery() {
  const img = document.getElementById("modalImage");
  if (!img) return;
  if (!modalImages.length) modalImages = ["./assets/placeholder1.jpg"];
  if (modalIndex < 0) modalIndex = modalImages.length - 1;
  if (modalIndex >= modalImages.length) modalIndex = 0;
  img.src = modalImages[modalIndex];
  const counter = document.getElementById("modalCounter");
  if (counter) counter.textContent = `${modalIndex + 1} из ${modalImages.length}`;
  const many = modalImages.length > 1;
  const prevBtn = document.getElementById("modalPrev");
  const nextBtn = document.getElementById("modalNext");
  if (prevBtn) prevBtn.style.display = many ? "inline-flex" : "none";
  if (nextBtn) nextBtn.style.display = many ? "inline-flex" : "none";
}

function openProductModal(p) {
  const backdrop = document.getElementById("modalBackdrop");
  if (!backdrop || !p) return;
  const titleEl = backdrop.querySelector("#modalTitle");
  const textEl = backdrop.querySelector("#modalText");
  const specsEl = backdrop.querySelector("#modalSpecs");
  if (titleEl) titleEl.textContent = p.title || "";
  if (textEl) textEl.textContent = p.full || "";
  if (specsEl) {
    specsEl.innerHTML = (p.specs || [])
      .map((s) => `<span class="badge">${escapeHtml(s)}</span>`)
      .join("");
  }
  const avito = backdrop.querySelector("#modalAvito");
  if (avito) avito.href = p.avito || AVITO_FALLBACK;
  const ozon = backdrop.querySelector("#modalOzon");
  if (ozon) ozon.href = p.ozon || OZON_FALLBACK;
  const wb = backdrop.querySelector("#modalWb");
  if (wb) {
    wb.href = p.wbUrl || "#";
    wb.style.display = p.wbUrl ? "inline-flex" : "none";
  }
  modalImages = (p.images || []).filter(Boolean);
  modalIndex = 0;
  renderModalGallery();
  backdrop.classList.add("open");
}

// ===== Cards swipe =====
const cardState = new WeakMap();

function setCardIndex(st, idx) {
  const n = st.images.length || 1;
  st.idx = (idx + n) % n;
  st.imgEl.src = st.images[st.idx];
  if (st.dotsEl) {
    [...st.dotsEl.children].forEach((d, i) =>
      d.classList.toggle("active", i === st.idx)
    );
  }
}

function buildCardDots(st) {
  const n = st.images.length;
  if (!st.dotsEl || n <= 1) return;
  st.dotsEl.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cardDot" + (i === 0 ? " active" : "");
    b.setAttribute("aria-label", `Фото ${i + 1} из ${n}`);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      setCardIndex(st, i);
    });
    st.dotsEl.appendChild(b);
  }
}

function attachSwipe(st, targetEl) {
  let downX = 0,
    downY = 0,
    moved = false;
  targetEl.addEventListener("pointerdown", (e) => {
    downX = e.clientX;
    downY = e.clientY;
    moved = false;
    targetEl.setPointerCapture?.(e.pointerId);
  });
  targetEl.addEventListener("pointermove", (e) => {
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
  });
  targetEl.addEventListener("pointerup", (e) => {
    const dx = e.clientX - downX;
    if (moved && Math.abs(dx) > 30 && st.images.length > 1) {
      st.justSwiped = true;
      setCardIndex(st, st.idx + (dx < 0 ? 1 : -1));
      setTimeout(() => (st.justSwiped = false), 0);
    }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-close]").forEach((b) =>
    b.addEventListener("click", closeModal)
  );
  document.getElementById("modalBackdrop")?.addEventListener("click", (e) => {
    if (e.target?.id === "modalBackdrop") closeModal();
  });
  document.getElementById("modalPrev")?.addEventListener("click", () => {
    modalIndex--;
    renderModalGallery();
  });
  document.getElementById("modalNext")?.addEventListener("click", () => {
    modalIndex++;
    renderModalGallery();
  });
  document.addEventListener("keydown", (e) => {
    if (!isOpen()) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") {
      modalIndex--;
      renderModalGallery();
    }
    if (e.key === "ArrowRight") {
      modalIndex++;
      renderModalGallery();
    }
  });

  const cards = document.getElementById("cards");
  if (!cards) return;
  const q = query(ref(db, "products"), orderByChild("published"), equalTo(true));
  onValue(q, (snap) => {
    const obj = snap.val() || {};
    const arr = Object.entries(obj).map(([id, v]) => ({ id, ...v }));
    arr.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    cards.innerHTML = "";

    if (!arr.length) {
      cards.innerHTML = `<div class="panel" style="padding:24px;text-align:center;color:var(--text-secondary)">Пока нет товаров. Следите за обновлениями!</div>`;
      return;
    }
    arr.forEach((p) => {
      const imagesRaw = Array.isArray(p?.imageUrls) && p.imageUrls.length
        ? p.imageUrls
        : p?.imageUrl
        ? [p.imageUrl]
        : [];
      const images = imagesRaw.filter((x) => typeof x === "string" && x.trim().length > 0);
      const safeImages = images.length ? images : ["./assets/placeholder1.jpg"];
      const cover = safeImages[0];

      const specs = [];
      if (p.size) specs.push(p.size);
      if (p.material) specs.push(p.material);
      if (p.term) specs.push(p.term);
      // ❌ УБРАЛИ наличие из бейджей

      const card = document.createElement("div");
      card.className = "card fade-up";
      card.innerHTML = `
        <div class="cardMedia">
          <img class="cardImg" src="${cover}" alt="${escapeHtml(p.title)}">
          <div class="cardDots" aria-hidden="true"></div>
        </div>
        <div class="cardBody">
          <h3 class="cardTitle">${escapeHtml(p.title)}</h3>
          <p class="cardText">${escapeHtml(p.short || "")}</p>
          <div class="badges">${specs.map((s) => `<span class="badge">${escapeHtml(s)}</span>`).join("")}</div>
          <a class="btnOrder" href="#modal" data-open-modal="${p.id}">Заказать</a>
        </div>
      `;

      cards.appendChild(card);
      const media = card.querySelector(".cardMedia") || card;
      const imgEl = card.querySelector(".cardImg") || card.querySelector("img");
      const dotsEl = card.querySelector(".cardDots");
      const st = { images: safeImages, idx: 0, imgEl, dotsEl, justSwiped: false };
      cardState.set(card, st);
      buildCardDots(st);
      attachSwipe(st, media);
      card.querySelector(".btnOrder")?.addEventListener("click", (e) => e.stopPropagation());
      dotsEl?.addEventListener("click", (e) => e.stopPropagation());
      card.addEventListener("click", () => {
        const st2 = cardState.get(card);
        if (st2?.justSwiped) return;
        openProductModal({
          title: p.title,
          full: p.full || p.short,
          specs,
          images: safeImages,
          avito: p.avitoUrl || AVITO_FALLBACK,
          ozon: p.ozonUrl || OZON_FALLBACK,
          wbUrl: p.wbUrl,
        });
      });
    });
  });
});