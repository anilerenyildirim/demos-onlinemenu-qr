/**
 * QR menü istemci davranışı. Sayfa JS olmadan da tam çalışır (her şube × dil ayrı statik sayfa, bağlantılar gerçek);
 * bu katman şube değişimini sayfa yenilemeden uygular, ürün ayrıntısını açar ve demo görünümünü yönetir.
 *
 * Depolama yalnızca demo anahtarı içindir (şube farkları görünümü), veri kaynağı değildir; erişilemezse yok sayılır.
 */
import { formatPrice, weekdayName } from "../shared/format";
import { displayTime, nowIn, openState } from "../shared/hours";
import type { ClientBranch, MenuState } from "../shared/state";

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const KEY_DIFF = "coffeehouse-demo:diff";
const store = {
  get(k: string) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { sessionStorage.setItem(k, v); } catch { /* gizli sekme — önemsiz */ } },
};

const S: MenuState = JSON.parse(document.getElementById("state")!.textContent!);
const L = S.locale;
const bySlug = new Map(S.branches.map((b) => [b.slug, b]));
const slugFromPath = (p: string) => p.match(/\/menu\/([^/]+)(?:\/(?:tr|en|ar|ru))?\/?$/)?.[1] ?? null;
let current: ClientBranch = bySlug.get(slugFromPath(location.pathname) ?? "") ?? bySlug.get(S.page)!;
const price = (minor: number) => formatPrice(minor, current.currency, L);

// ─── Yükseklikler: sabit demo çubuğu + yapışkan kategori şeridi ─────────────
const root = document.documentElement;
const watchHeight = (el: Element | null, prop: string) => {
  if (!el) return;
  new ResizeObserver(([e]) => root.style.setProperty(prop, `${Math.ceil(e.borderBoxSize[0].blockSize)}px`)).observe(el);
};
watchHeight($("[data-cats]"), "--cats-h");

// ─── Açık / kapalı ──────────────────────────────────────────────────────────
function statusText(b: ClientBranch): { text: string; open: boolean } {
  const s = openState(b.hours, nowIn(b.tz));
  if (s.open) return { text: fill(S.t.openNow, { t: displayTime(s.closes) }), open: true };
  if (!s.opens) return { text: S.t.closedNoHours, open: false };
  const day = s.inDays === 0 ? "" : s.inDays === 1 ? `${S.t.tomorrow} ` : `${weekdayName(s.weekday, L)} `;
  return { text: fill(S.t.closedNow, { t: day + s.opens }), open: false };
}

function renderStatus() {
  const s = statusText(current);
  const el = $("[data-open-status]")!;
  el.textContent = s.text;
  el.classList.toggle("is-open", s.open);
  el.classList.remove("is-pending");
  for (const li of $$("[data-status-for]")) li.textContent = statusText(bySlug.get(li.dataset.statusFor!)!).text;
  const today = nowIn(current.tz).weekday;
  for (const row of $$<HTMLTableRowElement>("[data-b=hours] tr")) {
    const isToday = Number(row.dataset.weekday) === today;
    row.classList.toggle("is-today", isToday);
    $(".today", row)?.remove();
    if (isToday) row.cells[0].insertAdjacentHTML("beforeend", `<span class="today"> · ${esc(S.t.today)}</span>`);
  }
}

// ─── Şube uygula ────────────────────────────────────────────────────────────
function hoursHtml(b: ClientBranch) {
  return [1, 2, 3, 4, 5, 6, 7].map((wd) => {
    const h = b.hours.find((x) => x.weekday === wd);
    const time = h ? `<bdi>${h.opens}–${displayTime(h.closes)}</bdi>` : esc(S.t.closedNoHours);
    return `<tr data-weekday="${wd}"><th scope="row">${esc(weekdayName(wd, L))}</th><td>${time}</td></tr>`;
  }).join("");
}

function summary(b: ClientBranch): string {
  const count = (fn: (i: number) => boolean) => [...b.a].filter((_, i) => fn(i)).length;
  return fill(S.t.diffSummary, {
    price: count((i) => (b.f[i] === "c" || b.f[i] === "x") && b.a[i] !== "h"),
    sold: count((i) => b.a[i] === "s"),
    hidden: count((i) => b.a[i] === "h" && b.f[i] !== "z"),
    only: count((i) => b.f[i] === "o"),
  });
}

function apply(b: ClientBranch) {
  current = b;
  document.body.dataset.brand = b.brand;
  $<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", b.brand === "coffee-art" ? "#462619" : "#FFFFFF");
  for (const el of $$("[data-b=name]")) el.textContent = b.name;
  for (const el of $$("[data-b=brandName]")) el.textContent = b.brandName;
  $("[data-b=city]")!.textContent = b.city;
  $("[data-b=address]")!.textContent = b.address;
  $("[data-b=currency]")!.textContent = b.currency;
  $("[data-b=tier]")!.textContent = b.tier;
  $<HTMLAnchorElement>("[data-b=maps]")!.href = b.maps;
  $("[data-b=hours]")!.innerHTML = hoursHtml(b);
  for (const a of $$<HTMLAnchorElement>(".mh__brand")) a.href = b.url[L];
  document.title = b.title;

  // Kartlar: görünürlük, rozetler, fiyatlar (varyant sırası kart sırasıyla aynı)
  for (const li of $$<HTMLLIElement>("li[data-i]")) {
    const i = Number(li.dataset.i);
    const a = b.a[i], f = b.f[i];
    li.hidden = a === "h";
    li.classList.toggle("is-sold", a === "s");
    li.classList.toggle("is-campaign", f === "c");
    li.classList.toggle("is-diff", f === "c" || f === "x");
    for (const sz of $$<HTMLLIElement>(".size", li)) {
      const v = Number(sz.dataset.v);
      const p = b.p[i][v], r = b.r[i][v], c = b.cp[i][v];
      if (p === undefined) continue;
      $("[data-p] bdi", sz)!.textContent = price(p);
      const was = $<HTMLElement>("[data-was]", sz)!;
      was.hidden = r === p;
      $("bdi", was)!.textContent = price(r);
      const central = $<HTMLElement>("[data-c]", sz)!;
      central.hidden = c === p;
      $("bdi", central)!.textContent = fill(S.t.diffCentral, { p: price(c) });
    }
  }
  // Tüm ürünleri gizli kategori → bölüm ve sekme gizlenir
  for (const sec of $$<HTMLElement>("[data-cat]")) {
    sec.hidden = $$<HTMLLIElement>("li[data-i]", sec).every((li) => li.hidden);
    const tab = $<HTMLAnchorElement>(`[data-cat-link][href="#${CSS.escape(sec.id)}"]`);
    if (tab) tab.parentElement!.hidden = sec.hidden;
  }
  const hidden = [...b.a].filter((x, i) => x === "h" && b.f[i] !== "z").length;
  const note = $("[data-hidden-note]")!;
  note.hidden = hidden === 0;
  note.textContent = fill(S.t.hiddenHere, { n: hidden });
  $("[data-diff-summary]")!.textContent = summary(b);

  for (const a of $$<HTMLAnchorElement>("[data-slug]")) {
    if (a.dataset.slug === b.slug) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  for (const a of $$<HTMLAnchorElement>("a[data-lang]")) a.href = b.url[a.dataset.lang as keyof ClientBranch["url"]];
  renderStatus();
}

function select(slug: string, how: "push" | "replace" | "none") {
  const b = bySlug.get(slug);
  if (!b) return;
  apply(b);
  if (how !== "none") history[how === "push" ? "pushState" : "replaceState"]({ slug }, "", b.url[L]);
}

// ─── Dialog yardımcıları ────────────────────────────────────────────────────
function wireDialog(d: HTMLDialogElement) {
  for (const btn of $$("[data-close]", d)) btn.addEventListener("click", () => d.close());
  // Arka plana tıklama kapatır (dialog kutusunun dışı)
  d.addEventListener("click", (e) => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) d.close();
  });
}

// ─── Şube listesi ───────────────────────────────────────────────────────────
const branchesDialog = $<HTMLDialogElement>("#branches")!;
wireDialog(branchesDialog);
const opener = $<HTMLAnchorElement>("[data-branch-open]")!;
opener.addEventListener("click", (e) => {
  e.preventDefault();
  branchesDialog.showModal();
  $<HTMLAnchorElement>("[data-slug][aria-current]", branchesDialog)?.focus();
});
branchesDialog.addEventListener("close", () => opener.focus());
for (const a of $$<HTMLAnchorElement>("#branches [data-slug]")) {
  a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // yeni sekme → tarayıcıya bırak
    e.preventDefault();
    const changed = a.dataset.slug !== current.slug;
    select(a.dataset.slug!, changed ? "push" : "none");
    branchesDialog.close();
    if (changed) {
      $("[data-live]")!.textContent = fill(S.t.switched, { branch: current.name });
      scrollTo({ top: 0 });
    }
  });
}
addEventListener("popstate", () => select(slugFromPath(location.pathname) ?? S.page, "none"));

// ─── Ürün ayrıntısı ─────────────────────────────────────────────────────────
const pd = $<HTMLDialogElement>("#product")!;
wireDialog(pd);
let pdReturn: HTMLElement | null = null;
pd.addEventListener("close", () => pdReturn?.focus());

function cupScale(ml: number | null, all: (number | null)[]) {
  const vals = all.filter((x): x is number => x !== null);
  if (ml === null || vals.length < 2) return 1;
  const min = Math.min(...vals), max = Math.max(...vals);
  return max === min ? 1 : (ml - min) / (max - min);
}
function cupSvg(scale: number) {
  const h = 11 + 9 * scale, top = 22 - h, w = 5.2 + 2.6 * scale;
  return `<svg class="cup" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false"><path d="M${(12 - w).toFixed(2)} ${(top + 2).toFixed(2)}h${(2 * w).toFixed(2)}l-${(w * 0.28).toFixed(2)} ${(h - 2).toFixed(2)}h-${(2 * w - 0.56 * w).toFixed(2)}Z" fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M${(12 - w - 0.8).toFixed(2)} ${(top + 2).toFixed(2)}h${(2 * w + 1.6).toFixed(2)}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function openProduct(i: number, from: HTMLElement) {
  const p = S.products[i];
  const b = current;
  pdReturn = from;
  const media = $("[data-pd-media]", pd)!;
  media.innerHTML = p.img
    ? `<picture><source type="image/avif" srcset="${p.img.avif}" sizes="(min-width: 40rem) 560px, 100vw"><source type="image/webp" srcset="${p.img.webp}" sizes="(min-width: 40rem) 560px, 100vw"><img src="${p.img.src}" alt="${esc(p.n)}" width="640" height="640" decoding="async"></picture>`
    : ($(`li[data-i="${i}"] .item__ph`)?.innerHTML ?? "");
  media.classList.toggle("is-ph", !p.img);
  $("[data-pd-name]", pd)!.textContent = p.n;
  $("[data-pd-desc]", pd)!.textContent = p.d;

  const badges: string[] = [];
  if (p.t.includes("new")) badges.push(`<span class="badge badge--new">${esc(S.t.new)}</span>`);
  if (b.f[i] === "c") badges.push(`<span class="badge badge--campaign">${esc(S.t.campaign)}</span>`);
  if (b.a[i] === "s") badges.push(`<span class="badge badge--sold">${esc(S.t.soldOut)}</span>`);
  if (b.f[i] === "o") badges.push(`<span class="badge badge--only">${esc(S.t.branchOnly)}</span>`);
  const badgeEl = $("[data-pd-badges]", pd)!;
  badgeEl.innerHTML = badges.join("");
  badgeEl.hidden = badges.length === 0;

  // Boy seçimi: tek boylu üründe gizli
  const wrap = $<HTMLFieldSetElement>("[data-pd-sizes-wrap]", pd)!;
  const seg = $("[data-pd-sizes]", pd)!;
  const multi = p.v.length > 1;
  wrap.hidden = !multi;
  const mls = p.v.map((k) => S.sizes[k].ml);
  seg.innerHTML = multi
    ? p.v.map((k, vi) => {
      const sz = S.sizes[k];
      const ml = sz.ml ? `<span class="seg__ml">${esc(fill(S.t.ml, { ml: sz.ml }))}</span>` : "";
      return `<label class="seg__opt"><input type="radio" name="pd-size" value="${vi}"${vi === Math.min(1, p.v.length - 1) ? " checked" : ""}>${sz.ml ? cupSvg(cupScale(sz.ml, mls)) : ""}<span class="seg__k">${esc(sz.l ?? sz.s ?? "")}</span>${ml}<span class="seg__p"><bdi>${esc(price(b.p[i][vi]))}</bdi></span></label>`;
    }).join("")
    : "";
  const showPrice = () => {
    const vi = multi ? Number($<HTMLInputElement>("input[name=pd-size]:checked", seg)?.value ?? 0) : 0;
    $("[data-pd-price]", pd)!.innerHTML = `<bdi>${esc(price(b.p[i][vi]))}</bdi>`;
    const was = $<HTMLElement>("[data-pd-was]", pd)!;
    const r = b.r[i][vi];
    was.hidden = r === b.p[i][vi];
    was.innerHTML = `<span class="sr-only">${esc(S.t.was)}: </span><bdi>${esc(price(r))}</bdi>`;
    pd.classList.toggle("is-sold", b.a[i] === "s");
  };
  seg.onchange = showPrice;
  showPrice();

  const al = $("[data-pd-al]", pd)!;
  const icons = $(`li[data-i="${i}"] .item__al`);
  const iconSvgs = icons ? $$("svg", icons).map((s) => s.outerHTML) : [];
  al.innerHTML = p.al.length
    ? p.al.map((code, k) => `<li>${iconSvgs[k] ?? ""}<span>${esc(S.allergens[code])}</span></li>`).join("")
    : `<li class="pd__al-none">${esc(S.t.noAllergens)}</li>`;

  pd.showModal();
  pd.scrollTop = 0;
}
for (const btn of $$<HTMLButtonElement>("[data-open]")) {
  btn.addEventListener("click", () => openProduct(Number(btn.closest<HTMLElement>("[data-i]")!.dataset.i), btn));
}
// Kartın tamamı tıklanabilir (başlık düğmesi klavye ve ekran okuyucu içindir)
for (const li of $$<HTMLLIElement>("li[data-i]")) {
  li.addEventListener("click", (e) => {
    if ((e.target as Element).closest("button, a")) return;
    $<HTMLButtonElement>("[data-open]", li)?.click();
  });
}

// ─── Aktif kategori ─────────────────────────────────────────────────────────
const tabs = new Map($$<HTMLAnchorElement>("[data-cat-link]").map((a) => [a.hash.slice(1), a]));
const tabList = $(".cats__list");
const visible = new Set<string>();
const markActive = () => {
  const id = [...tabs.keys()].find((k) => visible.has(k));
  if (!id) return;
  for (const [k, a] of tabs) {
    if (k !== id) { a.removeAttribute("aria-current"); continue; }
    a.setAttribute("aria-current", "true");
    if (tabList) {
      const r = a.getBoundingClientRect(), lr = tabList.getBoundingClientRect();
      if (r.left < lr.left || r.right > lr.right) tabList.scrollBy({ left: r.left - lr.left - 16 });
    }
  }
};
const io = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
  markActive();
}, { rootMargin: "-25% 0px -65% 0px" });
for (const id of tabs.keys()) { const s = document.getElementById(id); if (s) io.observe(s); }

// ─── Demo görünümü: şube farkları ───────────────────────────────────────────
const diff = $<HTMLButtonElement>("[data-diff-toggle]");
const setDiff = (on: boolean) => {
  document.body.classList.toggle("show-diff", on);
  diff?.setAttribute("aria-checked", String(on));
  $("[data-diff-summary]")!.hidden = !on;
  store.set(KEY_DIFF, on ? "1" : "0");
};
diff?.addEventListener("click", () => setDiff(diff.getAttribute("aria-checked") !== "true"));

// ─── Başlat ─────────────────────────────────────────────────────────────────
if (current.slug !== S.page) apply(current);
else { $("[data-diff-summary]")!.textContent = summary(current); renderStatus(); }
if (store.get(KEY_DIFF) === "1") setDiff(true);
setInterval(renderStatus, 60_000);
