/**
 * Sunum sayfası davranışı: ilerleme çizgisi, bölüm gezgini, klavye ↓/↑ ile bölüm geçişi (kaydırma ele geçirilmez:
 * bölümün içeriği ekrana sığmıyorsa tuş normal kaydırır), panel ekran sekmeleri, e-posta kopyalama, grafik ipuçları.
 */
const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

const slides = $$<HTMLElement>(".slide");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── İlerleme çizgisi ───────────────────────────────────────────────────────
const bar = $("[data-progress]");
let ticking = false;
const progress = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  bar?.style.setProperty("--p", String(max > 0 ? Math.min(1, scrollY / max) : 0));
  ticking = false;
};
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
progress();

// ─── Geçerli bölüm: ekran ortasını kesen slayt ──────────────────────────────
let current = 0;
const nNum = $("[data-snav-n]"), nTitle = $("[data-snav-t]");
const prevBtn = $<HTMLButtonElement>('[data-go="-1"]'), nextBtn = $<HTMLButtonElement>('[data-go="1"]');
const setCurrent = (i: number) => {
  current = i;
  if (nNum) nNum.textContent = String(i + 1).padStart(2, "0");
  if (nTitle) nTitle.textContent = slides[i].dataset.title ?? "";
  if (prevBtn) prevBtn.disabled = i === 0;
  if (nextBtn) nextBtn.disabled = i === slides.length - 1;
};
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) setCurrent(slides.indexOf(e.target as HTMLElement));
}, { rootMargin: "-50% 0px -50% 0px" });
for (const s of slides) io.observe(s);
setCurrent(0);

const go = (i: number) => {
  const target = slides[Math.max(0, Math.min(slides.length - 1, i))];
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
};
prevBtn?.addEventListener("click", () => go(current - 1));
nextBtn?.addEventListener("click", () => go(current + 1));

// ─── Klavye: ↓/PageDown sonraki, ↑/PageUp önceki bölüm ──────────────────────
addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const t = e.target as HTMLElement;
  if (t.closest("input, textarea, select, [contenteditable], [role=tablist], details, .lh__chart")) return;
  const down = e.key === "ArrowDown" || e.key === "PageDown";
  const up = e.key === "ArrowUp" || e.key === "PageUp";
  if (!down && !up) return;
  const r = slides[current].getBoundingClientRect();
  // Bölümün ekran dışında kalan kısmı çeyrek ekrandan fazlaysa normal kaydırma (içerik atlanmasın)
  const slack = innerHeight * 0.25;
  if (down && r.bottom > innerHeight + slack) return;
  if (up && r.top < -slack) return;
  e.preventDefault();
  go(current + (down ? 1 : -1));
});

// ─── Panel ekranları: sekmeler (WAI-ARIA tabs, ok tuşlarıyla gezinme) ────────
for (const root of $$("[data-tabs]")) {
  const tabs = $$<HTMLButtonElement>("[role=tab]", root);
  const select = (tab: HTMLButtonElement, focus = true) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")!)!.hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (e) => {
      const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
      if (next === null) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length]);
    });
  });
}

// ─── E-posta kopyala ────────────────────────────────────────────────────────
const copy = $<HTMLButtonElement>("[data-copy]");
copy?.addEventListener("click", async () => {
  const addr = $("[data-email]")!.textContent!.trim();
  const label = $("span", copy)!;
  const original = label.textContent;
  try {
    await navigator.clipboard.writeText(addr);
  } catch {
    // İzin yoksa adresi seçili bırak (kullanıcı kopyalayabilir)
    const range = document.createRange();
    range.selectNodeContents($("[data-email]")!);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  }
  label.textContent = copy.dataset.copied ?? original;
  setTimeout(() => { label.textContent = original; }, 2200);
});

// ─── Grafik ipuçları (fare ve klavye odağı aynı) ────────────────────────────
const tip = $("[data-tip-box]");
const figure = tip?.parentElement;
const show = (dot: HTMLElement) => {
  if (!tip || !figure) return;
  const r = dot.getBoundingClientRect(), f = figure.getBoundingClientRect();
  tip.textContent = dot.dataset.tip ?? "";
  tip.style.left = `${r.left + r.width / 2 - f.left}px`;
  tip.style.top = `${r.top - f.top}px`;
  tip.hidden = false;
};
const hide = () => { if (tip) tip.hidden = true; };
for (const dot of $$("[data-tip]")) {
  dot.addEventListener("pointerenter", () => show(dot));
  dot.addEventListener("pointerleave", hide);
  dot.addEventListener("focus", () => show(dot));
  dot.addEventListener("blur", hide);
}
