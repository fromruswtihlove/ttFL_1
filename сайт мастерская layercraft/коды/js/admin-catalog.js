import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {  getAuth,  signInWithEmailAndPassword,  onAuthStateChanged,  signOut,} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {  getDatabase,  ref,  onValue,  set,  update,  remove,} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "заглушка",
  authDomain: "заглушка",
  databaseURL: "заглушка",
  projectId: "заглушка",
  storageBucket: "заглушка",
  messagingSenderId: "заглушка",
  appId: "заглушка",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function newId() {
  return (crypto?.randomUUID?.() || `p_${Date.now()}_${Math.random().toString(16).slice(2)}`);
}

function num(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function getImagesFromProduct(p) {
  if (Array.isArray(p?.imageUrls) && p.imageUrls.length) {
    return {
      urls: p.imageUrls.filter(Boolean),
      paths: Array.isArray(p?.imagePaths) ? p.imagePaths.filter(Boolean) : [],
    };
  }
  const urls = [];
  const paths = [];
  if (p?.imageUrl) urls.push(p.imageUrl);
  if (p?.imagePath) paths.push(p.imagePath);
  return { urls, paths };
}

async function uploadImageToHost(file, productId) {
  if (!auth.currentUser) throw new Error("Not authenticated");

  const idToken = await auth.currentUser.getIdToken(true);

  const fd = new FormData();
  fd.append("idToken", idToken);
  fd.append("productId", productId);
  fd.append("file", file);
  const res = await fetch("./upload-product-image.php", {
    method: "POST",
    body: fd,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Upload failed (${res.status})`);
  }
  return { url: json.url, path: json.path };
}

function renderLists(productsObj) {
  const publishedEl = document.getElementById("publishedList");
  const unpublishedEl = document.getElementById("unpublishedList");
  const publishedCountEl = document.getElementById("publishedCount");
  const unpublishedCountEl = document.getElementById("unpublishedCount");

  const arr = Object.entries(productsObj || {}).map(([id, v]) => ({ id, ...v }));
  arr.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));

  const published = arr.filter((x) => !!x.published);
  const unpublished = arr.filter((x) => !x.published);

  publishedCountEl.textContent = String(published.length);
  unpublishedCountEl.textContent = String(unpublished.length);

  function oneItem(p) {
    const el = document.createElement("div");
    el.className = "reviewItem";

    const imgs = getImagesFromProduct(p);
    const cover = imgs.urls[0] || "";

    const imgHtml = cover
      ? `<img src="${cover}" alt="" style="margin-top:10px; max-height:160px; object-fit:cover; border-radius:14px;">`
      : "";

    const countHtml = imgs.urls.length > 1
      ? `<div class="meta" style="margin-top:6px;">Фото: ${imgs.urls.length}</div>`
      : "";

    el.innerHTML = `
      <b>${escapeHtml(p.title || "Без названия")}</b>
      <div class="meta">
        Наличие: ${escapeHtml(String(p.qty ?? 0))} шт ·
        ${p.published ? "Опубликован" : "Не опубликован"}
      </div>
      <div style="margin-top:10px; line-height:1.55;">
        ${escapeHtml(p.short || "")}
      </div>
      ${imgHtml}
      ${countHtml}
      <div class="badges" style="margin-top:12px;">
        <button class="btn btnPrimary" type="button" data-toggle="${p.id}">
          ${p.published ? "Снять с публикации" : "Опубликовать"}
        </button>
        <button class="btn btnGhost" type="button" data-edit="${p.id}">Изменить</button>
        <button class="btn btnGhost" type="button" data-delete="${p.id}">Удалить</button>
      </div>
    `;
    return el;
  }

  publishedEl.innerHTML = "";
  unpublishedEl.innerHTML = "";

  if (!published.length) publishedEl.innerHTML = `<div class="reviewItem"><b>Пусто</b></div>`;
  if (!unpublished.length) unpublishedEl.innerHTML = `<div class="reviewItem"><b>Пусто</b></div>`;

  for (const p of published) publishedEl.appendChild(oneItem(p));
  for (const p of unpublished) unpublishedEl.appendChild(oneItem(p));
  document.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-toggle");
      const cur = (productsObj || {})[id];
      if (!cur) return;

      await update(ref(db, `products/${id}`), {
        published: !cur.published,
        updatedAtMs: Date.now(),
      });
    });
  });

  // edit
  document.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const p = (productsObj || {})[id];
      if (!p) return;

      const form = document.getElementById("productForm");

      form.elements.namedItem("productId").value = id;
      form.elements.namedItem("title").value = p.title || "";
      form.elements.namedItem("short").value = p.short || "";
      form.elements.namedItem("size").value = p.size || "";
      form.elements.namedItem("material").value = p.material || "";
      form.elements.namedItem("term").value = p.term || "";
      form.elements.namedItem("qty").value = String(p.qty ?? 0);
      form.elements.namedItem("full").value = p.full || "";
      form.elements.namedItem("avitoUrl").value = p.avitoUrl || "";
      form.elements.namedItem("ozonUrl").value = p.ozonUrl || "";
      form.elements.namedItem("published").checked = !!p.published;

      const imgs = getImagesFromProduct(p);
      const hint = document.getElementById("formHint");
      hint.textContent =
        `Режим редактирования. Сейчас фото: ${imgs.urls.length || 0}. ` +
        `Если выбрать новые фото — они заменят текущие.`;

      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete");
      const ok = confirm("Вы точно хотите удалить товар?");
      if (!ok) return;
      await remove(ref(db, `products/${id}`));
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const gate = document.getElementById("adminGate");
  const panel = document.getElementById("adminPanel");
  const loginForm = document.getElementById("adminLogin");
  const logoutBtn = document.getElementById("logoutBtn");

  const form = document.getElementById("productForm");
  const saveBtn = document.getElementById("saveBtn");
  const resetBtn = document.getElementById("resetBtn");

  let cachedProducts = {};

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await signInWithEmailAndPassword(
      auth,
      loginForm.email.value.trim(),
      loginForm.password.value
    );
  });

  logoutBtn?.addEventListener("click", () => signOut(auth));

  resetBtn?.addEventListener("click", () => {
    form.reset();
    form.elements.namedItem("productId").value = "";
    const hint = document.getElementById("formHint");
    if (hint) hint.textContent = "Для редактирования нажми “Изменить” у товара.";
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;

    try {
      const productId = form.elements.namedItem("productId").value || newId();
      const prev = cachedProducts[productId] || null;

      const title = form.elements.namedItem("title").value.trim();
      const short = form.elements.namedItem("short").value.trim();
      if (!title || !short) {
        alert("Заполни название и короткое описание.");
        return;
      }

      // Надёжно берём file input по name через elements.namedItem() [web:739][web:764]
      const photosEl =
        form.elements.namedItem("photos") ||
        form.elements.namedItem("photo"); // fallback

      const files = photosEl ? Array.from(photosEl.files || []) : [];

      if (!prev && files.length === 0) {
        alert("Для нового товара нужно прикрепить хотя бы 1 фото.");
        return;
      }

      let { urls: imageUrls, paths: imagePaths } = getImagesFromProduct(prev);
      if (files.length > 0) {
        if (files.length > 10) {
          alert("Слишком много фото. Максимум 10.");
          return;
        }

        imageUrls = [];
        imagePaths = [];

        for (const f of files) {
          const up = await uploadImageToHost(f, productId);
          imageUrls.push(up.url);
          imagePaths.push(up.path);
        }
      }

      const payload = {
        title,
        short,
        size: form.elements.namedItem("size").value.trim(),
        material: form.elements.namedItem("material").value.trim(),
        term: form.elements.namedItem("term").value.trim(),
        qty: Math.max(0, Math.floor(num(form.elements.namedItem("qty").value, 0))),
        full: form.elements.namedItem("full").value.trim(),
        avitoUrl: form.elements.namedItem("avitoUrl").value.trim(),
        ozonUrl: form.elements.namedItem("ozonUrl").value.trim(),
        wbUrl: form.elements.namedItem("wbUrl").value.trim(),

        imageUrls,
        imagePaths,
        imageUrl: imageUrls[0] || "",
        imagePath: imagePaths[0] || "",

        published: !!form.elements.namedItem("published").checked,
        updatedAtMs: Date.now(),
      };
      if (!prev) payload.createdAtMs = Date.now();

      await set(ref(db, `products/${productId}`), { ...(prev || {}), ...payload });

      form.reset();
      form.elements.namedItem("productId").value = "";
      const hint = document.getElementById("formHint");
      if (hint) hint.textContent = "Для редактирования нажми “Изменить” у товара.";

      alert("Сохранено!");
    } catch (err) {
      console.error(err);
      alert(`Ошибка: ${err?.message || err}`);
    } finally {
      saveBtn.disabled = false;
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      gate.style.display = "block";
      panel.style.display = "none";
      return;
    }

    gate.style.display = "none";
    panel.style.display = "block";
    gate.style.display = "none"
    onValue(ref(db, "products"), (snap) => {
      cachedProducts = snap.val() || {};
      renderLists(cachedProducts);
    });
  });
});
