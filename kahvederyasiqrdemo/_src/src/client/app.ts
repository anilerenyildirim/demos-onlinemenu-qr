/**
 * İstemci davranışı. Sayfa JS olmadan da tam çalışır (her şube ayrı statik sayfa, bağlantılar gerçek);
 * bu katman şube değişimini sayfa yenilemeden uygular ve küçük kolaylıklar ekler.
 *
 * localStorage yalnızca şube ve dil tercihi içindir, veri kaynağı değildir; erişilemezse sessizce yok sayılır.
 */
import type { Locale } from "../data/schema";
import { formatPrice, weekdayName } from "../shared/format";
import { displayTime, nowIn, openState } from "../shared/hours";
import type { ClientBranch, ClientState } from "../shared/state";

const KEY_BRANCH = "kahvederyasi-demo:branch";
const KEY_LANG = "kahvederyasi-demo:lang";

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

const store = {
  get(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* gizli sekme / engelli depolama — önemsiz */ }
  },
};

const S: ClientState = JSON.parse(document.getElementById("state")!.textContent!);
const L: Locale = S.locale;
const bySlug = new Map(S.branches.map((b) => [b.slug, b]));
const slugFromPath = (p: string) => p.match(/\/sube\/([^/]+)\/?$/)?.[1] ?? null;
let current: ClientBranch = bySlug.get(slugFromPath(location.pathname) ?? "") ?? bySlug.get($("[data-slug][aria-current]")!.dataset.slug!)!;

// ─── Yükseklikler: sabit şerit + yapışkan çubuk ─────────────────────────────
const root = document.documentElement;
const watchHeight = (el: Element | null, prop: string) => {
  if (!el) return;
  new ResizeObserver(([e]) => root.style.setProperty(prop, `${Math.ceil(e.borderBoxSize[0].blockSize)}px`)).observe(el);
};
watchHeight($("[data-strip]"), "--strip-h");
watchHeight($("[data-bar]"), "--bar-h");

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
    if (isToday) row.cells[0].insertAdjacentHTML("beforeend", `<span class="today"> · ${S.t.today}</span>`);
  }
}

// ─── Şube uygula ────────────────────────────────────────────────────────────
function hoursHtml(b: ClientBranch) {
  return [1, 2, 3, 4, 5, 6, 7].map((wd) => {
    const h = b.hours.find((x) => x.weekday === wd);
    const time = h ? `<bdi>${h.opens}–${displayTime(h.closes)}</bdi>` : S.t.closedNoHours;
    return `<tr data-weekday="${wd}"><th scope="row">${weekdayName(wd, L)}</th><td>${time}</td></tr>`;
  }).join("");
}

function apply(b: ClientBranch) {
  current = b;
  for (const el of $$("[data-b=name]")) el.textContent = b.name;
  $("[data-b=city]")!.textContent = b.city;
  $("[data-b=kind]")!.textContent = b.kind;
  $("[data-b=tier]")!.textContent = b.tier;
  $("[data-b=address]")!.textContent = b.address;
  const phone = $<HTMLAnchorElement>("[data-b=phone]")!;
  phone.href = b.tel;
  phone.firstElementChild!.textContent = b.phone;
  $("[data-b=hours]")!.innerHTML = hoursHtml(b);
  document.title = b.title;

  // Kartlar: fiyat, tükendi, şubede yok, merkezden farklı
  let hidden = 0;
  for (const li of $$<HTMLLIElement>("li[data-i]")) {
    const i = Number(li.dataset.i);
    const a = b.avail[i];
    li.hidden = a === "h";
    if (a === "h") hidden++;
    li.classList.toggle("is-sold", a === "s");
    li.classList.toggle("is-diff", b.flags[i] === "1");
    $("[data-price]", li)!.textContent = formatPrice(b.prices[i], L);
  }
  const note = $("[data-hidden-note]")!;
  note.hidden = hidden === 0;
  note.textContent = fill(S.t.hiddenHere, { n: hidden });

  // Karşılaştırma tablosu: geçerli şube sütunu
  for (const el of $$("[data-col]")) el.classList.toggle("is-current", el.dataset.col === b.slug);
  // Şube listesi + dil bağlantıları aynı şubeye gitsin
  for (const a of $$<HTMLAnchorElement>("[data-slug]")) {
    if (a.dataset.slug === b.slug) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  for (const a of $$<HTMLAnchorElement>("a[data-lang]")) a.href = b.url[a.dataset.lang as Locale];

  renderStatus();
}

function select(slug: string, how: "push" | "replace" | "none") {
  const b = bySlug.get(slug);
  if (!b) return;
  apply(b);
  store.set(KEY_BRANCH, slug);
  if (how !== "none") history[how === "push" ? "pushState" : "replaceState"]({ slug }, "", b.url[L]);
}

// ─── Şube listesi (popover) ─────────────────────────────────────────────────
const sheet = $("#branches");
sheet?.addEventListener("toggle", (e) => {
  if ((e as ToggleEvent).newState === "open") $<HTMLAnchorElement>("[data-slug][aria-current]", sheet)?.focus();
});
for (const a of $$<HTMLAnchorElement>("#branches [data-slug]")) {
  a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // yeni sekme vb. → tarayıcıya bırak
    e.preventDefault();
    const changed = a.dataset.slug !== current.slug;
    select(a.dataset.slug!, changed ? "push" : "none");
    try { sheet?.hidePopover(); } catch { /* popover desteklenmiyor */ }
    $<HTMLButtonElement>("[popovertarget=branches]")?.focus();
    if (changed) $("[data-live]")!.textContent = fill(S.t.switched, { branch: current.name });
  });
}
addEventListener("popstate", () => {
  const slug = slugFromPath(location.pathname) ?? S.branches[0].slug;
  select(slug, "none");
});

// ─── Dil tercihi ────────────────────────────────────────────────────────────
for (const a of $$<HTMLAnchorElement>("a[data-lang]")) a.addEventListener("click", () => store.set(KEY_LANG, a.dataset.lang!));

// ─── Ürün görselleri: dar mesafeli tembel yükleme (ilk yükleme bütçesi için) ─
const reveal = (pic: Element) => {
  for (const s of pic.querySelectorAll<HTMLSourceElement>("source[data-srcset]")) { s.srcset = s.dataset.srcset!; s.removeAttribute("data-srcset"); }
  const img = pic.querySelector<HTMLImageElement>("img[data-src]");
  if (img) { img.src = img.dataset.src!; img.removeAttribute("data-src"); }
  pic.removeAttribute("data-lazy");
};
const lazyIo = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { reveal(e.target); lazyIo.unobserve(e.target); }
}, { rootMargin: "300px 0px" });
for (const pic of $$("picture[data-lazy]")) lazyIo.observe(pic);
addEventListener("beforeprint", () => { for (const pic of $$("picture[data-lazy]")) reveal(pic); });

// ─── Aktif kategori ─────────────────────────────────────────────────────────
const links = new Map($$<HTMLAnchorElement>(".cats__link").map((a) => [a.hash.slice(1), a]));
const list = $(".cats__list");
const visible = new Set<string>();
const markActive = () => {
  const id = [...links.keys()].find((k) => visible.has(k));
  if (!id) return;
  for (const [k, a] of links) {
    if (k === id) {
      a.setAttribute("aria-current", "true");
      // Yatay listede görünür tut (sayfayı dikey kaydırmadan)
      if (list) {
        const r = a.getBoundingClientRect(), lr = list.getBoundingClientRect();
        if (r.left < lr.left || r.right > lr.right) list.scrollBy({ left: r.left - lr.left - 16 });
      }
    } else a.removeAttribute("aria-current");
  }
};
const io = new IntersectionObserver((entries) => {
  for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
  markActive();
}, { rootMargin: "-30% 0px -60% 0px" });
for (const id of links.keys()) { const s = document.getElementById(id); if (s) io.observe(s); }

// ─── Giriş sayfası: kayıtlı tercihler ───────────────────────────────────────
if (S.entry) {
  const lang = store.get(KEY_LANG);
  const langLink = lang && lang !== L ? $<HTMLAnchorElement>(`a[data-lang="${CSS.escape(lang)}"]`) : null;
  const saved = store.get(KEY_BRANCH);
  // Kök TR girişinde başka dil seçilmişse o dile geç (açık /en/, /ar/ ve /sube/ adreslerine dokunulmaz)
  if (langLink && L === "tr") {
    const b = saved && bySlug.get(saved);
    location.replace(b ? b.url[lang as Locale] : langLink.href);
  } else if (saved && saved !== current.slug && bySlug.has(saved)) {
    select(saved, "replace");
  }
} else {
  store.set(KEY_BRANCH, current.slug);
}

renderStatus();
setInterval(renderStatus, 60_000);
