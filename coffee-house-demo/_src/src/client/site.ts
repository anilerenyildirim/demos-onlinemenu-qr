/**
 * Kurumsal site davranışı. Sayfalar JS olmadan da okunur ve gezilir; bu katman ekler:
 *   · hero videosu — sayfa yüklendikten sonra, boşta; hareket azaltma / veri tasarrufu tercihine uyar, durdurulabilir
 *   · başvuru formu — istemci doğrulaması + başarı durumu (DEMO: gönderim yok)
 *   · şubeler — ülke filtresi, arama; harita görünür olunca ayrı modül olarak yüklenir (Leaflet yalnızca orada)
 */
import type { MapApi, MapData } from "./map";

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];
const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const lang = document.documentElement.lang;
const norm = (s: string) => s.toLocaleLowerCase(lang).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").trim();

// ─── Hero videosu (konuşma balonu penceresi) ────────────────────────────────
const ICON_PAUSE = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M8 5v14M16 5v14"/></svg>';
const ICON_PLAY = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><path d="M8 5.5v13l10.5-6.5L8 5.5Z"/></svg>';
const porthole = $("[data-porthole]");
if (porthole) {
  const video = $<HTMLVideoElement>("video", porthole)!;
  const btn = $<HTMLButtonElement>("[data-video-toggle]", porthole)!;
  let userPaused = false;
  const setBtn = (playing: boolean) => {
    btn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    btn.setAttribute("aria-label", (playing ? btn.dataset.pause : btn.dataset.play) ?? "");
  };
  const load = () => {
    if (video.dataset.loaded) return;
    video.dataset.loaded = "1";
    for (const [type, src] of [["video/webm", video.dataset.webm], ["video/mp4", video.dataset.mp4]] as const) {
      const s = document.createElement("source");
      s.type = type; s.src = src!;
      video.append(s);
    }
    video.load();
  };
  const play = () => { load(); video.play().catch(() => setBtn(false)); };
  video.addEventListener("playing", () => { porthole.classList.add("is-playing"); btn.hidden = false; setBtn(true); });
  video.addEventListener("pause", () => setBtn(false));
  btn.addEventListener("click", () => {
    if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
  });
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  if (reduce || saveData) { btn.hidden = false; setBtn(false); }
  else {
    // İlk boyama ve LCP (poster) bittikten sonra, tarayıcı boştayken
    const later = () => setTimeout(() => ("requestIdleCallback" in window ? requestIdleCallback(play, { timeout: 4000 }) : play()), 1800);
    if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
  }
  // Ekran dışındayken durdur (pil/işlemci), geri gelince — kullanıcı durdurmadıysa — sürdür
  new IntersectionObserver(([e]) => {
    if (!video.dataset.loaded || userPaused) return;
    if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
  }).observe(porthole);
}

// ─── Başvuru formu ──────────────────────────────────────────────────────────
// DEMO: gerçek gönderim YOK. Canlıda: Cloudflare Worker → Resend ile e-posta bildirimi, Cloudflare Turnstile,
// IP başına hız sınırı ve başvuruların panel.onlinemenu-qr.com'da listelenmesi.
const form = $<HTMLFormElement>("[data-form]");
if (form) {
  form.noValidate = true; // kendi mesajlarımız (her dilde) — tarayıcı balonları yerine
  const summary = $("[data-form-summary]", form)!;
  const success = $("[data-form-success]")!;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const rules: [string, (el: HTMLInputElement) => boolean][] = [
    ["name", (el) => el.value.trim().length >= 3],
    ["phone", (el) => el.value.replace(/\D/g, "").length >= 7],
    ["email", (el) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())],
    ["city", (el) => el.value.trim().length >= 2],
    ["area", (el) => el.value === "" || Number(el.value) >= 40],
    ["consent", (el) => el.checked],
  ];
  const show = (el: HTMLInputElement, ok: boolean) => {
    const err = document.getElementById(`${el.id}-err`)!;
    if (ok) el.removeAttribute("aria-invalid"); else el.setAttribute("aria-invalid", "true");
    err.hidden = ok;
    err.textContent = ok ? "" : err.dataset.msg ?? "";
    el.closest(".field")?.classList.toggle("is-invalid", !ok);
  };
  const check = () => rules.map(([name, rule]) => { const el = field(name); const ok = rule(el); show(el, ok); return { el, ok }; });
  // Hata gösterildikten sonra alan düzeltilince hemen temizlenir
  for (const [name, rule] of rules) {
    const el = field(name);
    el.addEventListener(el.type === "checkbox" ? "change" : "input", () => { if (el.getAttribute("aria-invalid")) show(el, rule(el)); });
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const bad = check().filter((r) => !r.ok);
    if (bad.length) {
      const list = $("ul", summary)!;
      list.innerHTML = "";
      for (const { el } of bad) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${el.id}`;
        a.textContent = document.getElementById(`${el.id}-err`)!.textContent;
        a.addEventListener("click", (ev) => { ev.preventDefault(); el.focus(); });
        li.append(a);
        list.append(li);
      }
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;
    const name = field("name").value.trim().split(/\s+/)[0];
    $("[data-success-body]", success)!.textContent = fill(success.dataset.body ?? "", { name, city: field("city").value.trim() });
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });
}

// ─── Şubeler: filtre + arama ────────────────────────────────────────────────
let mapApi: MapApi | null = null;
const branches = $("[data-branches]");
if (branches) {
  const items = $$<HTMLLIElement>(".loc", branches);
  const chips = $$<HTMLButtonElement>("[data-country]", branches);
  const search = $<HTMLInputElement>("[data-search]", branches)!;
  const count = $("[data-count]", branches)!;
  const empty = $("[data-empty]", branches)!;
  let country = "";
  const apply = () => {
    const q = norm(search.value);
    const visible = new Set<string>();
    for (const li of items) {
      const ok = (!country || li.dataset.country === country) && (!q || li.dataset.search!.includes(q));
      li.hidden = !ok;
      if (ok) visible.add(li.dataset.id!);
    }
    count.textContent = fill(count.dataset.tpl ?? "", { n: visible.size });
    empty.hidden = visible.size > 0;
    mapApi?.filter(visible);
  };
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      country = chip.dataset.country ?? "";
      for (const c of chips) c.setAttribute("aria-pressed", String(c === chip));
      apply();
    });
  }
  search.addEventListener("input", apply);
  for (const btn of $$<HTMLButtonElement>("[data-focus]", branches)) {
    btn.addEventListener("click", async () => {
      const mapEl = $("[data-map]")!;
      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      (await loadMap())?.focus(btn.dataset.focus!);
    });
  }
}

// ─── Harita: görünür olunca yükle ───────────────────────────────────────────
const mapEl = $<HTMLElement>("[data-map]");
let mapPromise: Promise<MapApi | null> | null = null;
function loadMap(): Promise<MapApi | null> {
  if (!mapEl) return Promise.resolve(null);
  mapPromise ??= (async () => {
    const data: MapData = JSON.parse(document.getElementById("map-data")!.textContent!);
    // Harita modülü ayrı paket (Leaflet dahil) — yalnızca harita sayfalarında, görünür olunca iner
    const mod: typeof import("./map") = await import(mapEl.dataset.js!);
    mapApi = await mod.initMap(mapEl, data);
    $(".map__loading", mapEl)?.remove();
    return mapApi;
  })().catch((e) => { console.error(e); return null; });
  return mapPromise;
}
if (mapEl) {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); loadMap(); } }, { rootMargin: "200px 0px" });
  io.observe(mapEl);
}
