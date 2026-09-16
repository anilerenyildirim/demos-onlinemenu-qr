/**
 * İstemci davranışı — sayfa JS olmadan da okunur ve gezilir; bu katman yalnızca kolaylık ekler.
 * localStorage yalnızca "son baktığın şube" önerisi için; doğru kaynak her zaman URL.
 */
import type { BranchHours } from "../data/schema";
import type { clientStrings } from "../render/entry";
import { displayTime, nowIn, openState } from "../shared/hours";
import { normalize } from "../shared/normalize";

type I18n = ReturnType<typeof clientStrings>;

const LAST_BRANCH_KEY = "kahvediyari-demo:last-branch";
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const readJson = <T>(id: string): T => JSON.parse(document.getElementById(id)!.textContent!);
const fill = (tpl: string, k: string, v: string | number) => tpl.replace(`{${k}}`, String(v));

const storage = {
  get(): string | null {
    try { return localStorage.getItem(LAST_BRANCH_KEY); } catch { return null; }
  },
  set(slug: string) {
    try { localStorage.setItem(LAST_BRANCH_KEY, slug); } catch { /* gizli sekme vb. — önemsiz */ }
  },
};

const i18n = readJson<I18n>("i18n");

// ─── Açık / kapalı durumu ───────────────────────────────────────────────────
function renderOpenStatus() {
  for (const el of $$("[data-open-status]")) {
    const hours: BranchHours[] = JSON.parse(el.dataset.hours!);
    const now = nowIn(el.dataset.tz!);
    const s = openState(hours, now);
    el.classList.toggle("is-open", s.open);
    if (s.open) {
      el.textContent = fill(i18n.openNow, "t", displayTime(s.closes));
    } else if (s.opens) {
      const day = s.inDays === 0 ? "" : s.inDays === 1 ? `${i18n.tomorrow} ` : `${i18n.weekdays[s.weekday - 1]} `;
      el.textContent = fill(i18n.closedNow, "t", day + s.opens);
    } else {
      el.textContent = i18n.closedNoHours;
    }
  }
  const tz = $("[data-open-status]")?.dataset.tz;
  if (tz) {
    const today = nowIn(tz).weekday;
    for (const row of $$("tr[data-weekday]")) {
      const isToday = Number(row.dataset.weekday) === today;
      row.classList.toggle("is-today", isToday);
      const th = $("th", row)!;
      $(".today", th)?.remove();
      if (isToday) th.insertAdjacentHTML("beforeend", `<span class="today"> · ${i18n.today}</span>`);
    }
  }
}

// ─── Giriş: şube arama + son şube ───────────────────────────────────────────
function initEntry() {
  const input = $<HTMLInputElement>("[data-branch-search]")!;
  const rows = $$("[data-branch-list] > li");
  const empty = $("[data-branch-empty]")!;

  input.addEventListener("input", () => {
    const tokens = normalize(input.value).split(" ").filter(Boolean);
    let visible = 0;
    for (const li of rows) {
      const match = tokens.every((tk) => li.dataset.search!.includes(tk));
      li.hidden = !match;
      if (match) visible++;
    }
    empty.hidden = visible > 0;
  });

  const last = storage.get();
  const link = last ? $<HTMLAnchorElement>(`[data-branch-list] a[data-slug="${CSS.escape(last)}"]`) : null;
  if (link) {
    const box = $("[data-continue]")!;
    $<HTMLAnchorElement>("[data-continue-link]", box)!.href = link.href;
    $("[data-continue-name]", box)!.textContent = link.dataset.name!;
    box.hidden = false;
  }
}

// ─── Menü ───────────────────────────────────────────────────────────────────
function initMenu() {
  const branch = readJson<{ slug: string }>("branch");
  storage.set(branch.slug);

  const root = document.documentElement;
  const catbar = $("[data-catbar]")!;
  const input = $<HTMLInputElement>("[data-menu-search]")!;
  const clear = $<HTMLButtonElement>("[data-search-clear]")!;
  const status = $("[data-search-status]")!;
  const empty = $("[data-search-empty]")!;
  const sections = $$("[data-cat]");
  const chips = $("[data-chips]")!;
  const chipFor = (id: string) => $<HTMLLIElement>(`[data-chip="${id}"]`, chips)!;
  const toggle = $<HTMLButtonElement>("[data-fx-toggle]")!;
  const summary = $("[data-fx-summary]")!;

  // Yapışkan çubuğun yüksekliği → bölüm çapalarının scroll-margin'i
  new ResizeObserver(([e]) => {
    root.style.setProperty("--catbar-h", `${Math.ceil(e.borderBoxSize[0].blockSize)}px`);
  }).observe(catbar);

  const fxOn = () => root.dataset.fx === "on";

  function applyFilter() {
    const tokens = normalize(input.value).split(" ").filter(Boolean);
    let total = 0;
    for (const sec of sections) {
      let visible = 0;
      for (const li of $$("[data-item]", sec)) {
        const match = tokens.every((tk) => li.dataset.search!.includes(tk));
        li.hidden = !match;
        if (match && (fxOn() || !li.classList.contains("is-hidden-here"))) visible++;
      }
      sec.hidden = visible === 0;
      chipFor(sec.id).hidden = visible === 0;
      total += visible;
    }
    clear.hidden = input.value === "";
    if (tokens.length === 0) {
      status.textContent = "";
      empty.hidden = true;
    } else if (total === 0) {
      empty.textContent = fill(i18n.searchNone, "q", input.value.trim());
      empty.hidden = false;
      status.textContent = empty.textContent;
    } else {
      empty.hidden = true;
      status.textContent = total === 1 ? i18n.searchCountOne : fill(i18n.searchCount, "n", total);
    }
    updateActiveChip();
  }

  input.addEventListener("input", applyFilter);
  clear.addEventListener("click", () => {
    input.value = "";
    applyFilter();
    input.focus();
  });

  // Franchise görünümü: merkezden farkları işaretler. ?farklar=1 ile açık paylaşılabilir.
  function setFx(on: boolean) {
    root.dataset.fx = on ? "on" : "off";
    toggle.setAttribute("aria-checked", String(on));
    summary.hidden = !on;
    applyFilter();
  }
  toggle.addEventListener("click", () => setFx(!fxOn()));

  // Aktif kategori: yapışkan çubuğun altındaki son bölüm
  let ticking = false;
  let activeId = "";
  function updateActiveChip() {
    const offset = catbar.getBoundingClientRect().height + 24;
    const visible = sections.filter((s) => !s.hidden);
    let current = visible[0];
    for (const s of visible) if (s.getBoundingClientRect().top <= offset) current = s;
    if (!current || current.id === activeId) return;
    activeId = current.id;
    for (const a of $$("a", chips)) a.removeAttribute("aria-current");
    const link = $("a", chipFor(current.id))!;
    link.setAttribute("aria-current", "true");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Çip konumu kaydırılan listeye göre (offsetLeft ortalanmış kapsayıcıda yanlış sonuç verir)
    const left = link.getBoundingClientRect().left - chips.getBoundingClientRect().left + chips.scrollLeft;
    const pad = parseFloat(getComputedStyle(chips).paddingLeft);
    chips.scrollTo({ left: Math.max(0, left - pad), behavior: reduce ? "auto" : "smooth" });
  }
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateActiveChip(); });
  }, { passive: true });

  // İlk durum: tüm durum değişkenleri tanımlandıktan sonra
  setFx(new URLSearchParams(location.search).get("farklar") === "1");
}

renderOpenStatus();
setInterval(renderOpenStatus, 60_000);
if (document.body.dataset.page === "entry") initEntry();
if (document.body.dataset.page === "menu") initMenu();
