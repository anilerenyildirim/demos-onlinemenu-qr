/**
 * Sunum giriş sayfası (/coffee-house-demo/) — franchisor'a hitap eden, dikey akan 7 bölümlük sunum (TR).
 * Her bölüm ekran boyunda bir "slayt"; kaydırma normal (scroll-jacking yok), üstte ilerleme çizgisi,
 * klavye ↓/↑ ile bölüm geçişi (client/brief.ts). Metinler i18n/sunum.json'dan; rakamlar veri/ölçümden.
 */
import { OFFER_EMAIL, OFFER_SUBJECT, paths } from "../config";
import { sunumStrings as S, fill } from "../i18n";
import { formatNumber } from "../shared/format";
import { renderDocument, type Preload } from "./document";
import { attrs, brandText, html, raw, type Raw } from "./html";
import { icons, omqrGlyph } from "./icons";
import { strings } from "../i18n";
import type { Responsive } from "./types";

export interface LighthouseResult {
  label: string; url: string; date: string; lighthouse_version: string; runs: number;
  median: { performance: number; accessibility: number; best_practices: number; seo: number; seo_excl_crawlable?: number; seo_failed?: string[]; lcp_ms: number; total_kb: number };
}

export interface BriefData {
  /** audit/coffee-house-lighthouse.json → results */
  current: LighthouseResult | null;
  demo: LighthouseResult | null;
  /** Panel "şube fiyatları" ekranı: gerçek demo verisinden (Cappuccino, 4 şube) */
  priceRows: { branch: string; brand: string; currency: string; tier: string; prices: string[] }[];
  priceSizes: string[];
  catalogRows: { name: string; category: string; branches: string; badge: string | null }[];
  counts: { branches: number; locales: number; currencies: number };
}

export interface BriefAssets {
  css: string;
  js: string;
  logo: string;
  /** Logonun mavi halka katmanı (izlenmiş SVG'den) — kapaktaki dev halka */
  ring: { viewBox: string; d: string };
  fonts: Preload[];
  og: { url: string; width: number; height: number };
  facade: Responsive;
  facadeAlt: string;
  bubbles: Responsive[];
  poster: Responsive;
}

const pic = (r: Responsive, alt: string, sizes: string, cls = "", eager = false): Raw => html`<picture${attrs({ class: cls || null })}>
  <source type="image/avif" srcset="${r.avif}" sizes="${sizes}">
  <source type="image/webp" srcset="${r.webp}" sizes="${sizes}">
  <img src="${r.src}" alt="${alt}" width="${r.w}" height="${r.h}"${raw(eager ? "" : ' loading="lazy"')} decoding="async">
</picture>`;

const num = (i: number) => String(i + 1).padStart(2, "0");
const secs = (ms: number) => formatNumber(ms / 1000, "tr", 1);
const mb = (kb: number) => formatNumber(kb / 1024, "tr", 1);

function sectionHead(i: number, eyebrow: string, title: string, id: string, lead?: string): Raw {
  return html`<header class="shead">
    <p class="eyebrow"><span class="eyebrow__n">${num(i)}</span>${eyebrow}</p>
    <h2 id="${id}">${title}</h2>
    ${lead ? html`<p class="lead">${lead}</p>` : ""}
  </header>`;
}

/** SEO notu: mevcut sitenin gerçek eksikleri (ölçümden) + demonun neden kıyaslanmadığı */
function seoNote(cur: LighthouseResult, demo: LighthouseResult): string {
  const L = S.lighthouse;
  const issues = (cur.median.seo_failed ?? []).map((id) => (L.seoIssues as Record<string, string>)[id]).filter(Boolean);
  return fill(L.seoNote, { cur: cur.median.seo, issues: issues.join(", ") || "—", demo: demo.median.seo_excl_crawlable ?? "—" });
}

/** Dumbbell: üç Lighthouse puanı (aynı 0–100 ölçeği) — mevcut (gri, geri plan) → demo (marka mavisi, vurgu). */
function lighthouseFigure(cur: LighthouseResult, demo: LighthouseResult): Raw {
  const L = S.lighthouse;
  // SEO kıyaslanmaz: demo sayfaları bilinçli olarak noindex (Lighthouse is-crawlable düşer) — bkz. seoNote
  const keys = ["performance", "accessibility", "best_practices"] as const;
  const rows = keys.map((k) => ({ k, label: L.metrics[k], a: cur.median[k], b: demo.median[k] }));
  return html`<figure class="lh" aria-labelledby="h-lh">
    <figcaption>
      <h3 id="h-lh">${L.title}</h3>
      <p>${L.lead}</p>
    </figcaption>
    <ul class="lh__legend" role="list">
      <li><span class="lh__key lh__key--a" aria-hidden="true"></span>${L.current}</li>
      <li><span class="lh__key lh__key--b" aria-hidden="true"></span>${L.demo}</li>
    </ul>
    <div class="lh__chart" role="img" aria-label="${rows.map((r) => `${r.label}: ${L.current} ${r.a}, ${L.demo} ${r.b}`).join("; ")}">
      ${rows.map((r) => html`<div class="lh__row">
        <span class="lh__label">${r.label}</span>
        <span class="lh__track" style="${`--a:${r.a};--b:${r.b}`}">
          <span class="lh__bar" aria-hidden="true"></span>
          <span class="lh__dot lh__dot--a" data-tip="${L.current} · ${r.label} ${r.a}" tabindex="0"><span class="lh__val">${r.a}</span></span>
          <span class="lh__dot lh__dot--b" data-tip="${L.demo} · ${r.label} ${r.b}" tabindex="0"><span class="lh__val">${r.b}</span></span>
        </span>
      </div>`)}
      <div class="lh__row lh__row--axis" aria-hidden="true"><span></span><span class="lh__track lh__axis">${[0, 50, 90, 100].map((x) => html`<span style="${`--x:${x}`}">${x}</span>`)}</span></div>
    </div>
    <dl class="lh__tiles">
      <div class="tile"><dt>${L.metrics.lcp}</dt><dd><span class="tile__a">${secs(cur.median.lcp_ms)} sn</span>${icons.arrow()}<span class="tile__b">${secs(demo.median.lcp_ms)} sn</span></dd></div>
      <div class="tile"><dt>${L.metrics.weight}</dt><dd><span class="tile__a">${mb(cur.median.total_kb)} MB</span>${icons.arrow()}<span class="tile__b">${mb(demo.median.total_kb)} MB</span></dd></div>
    </dl>
    <details class="lh__table">
      <summary>${L.tableToggle}</summary>
      <table>
        <thead><tr><th scope="col">${L.tableMetric}</th><th scope="col">${L.current}</th><th scope="col">${L.demo}</th></tr></thead>
        <tbody>
          ${rows.map((r) => html`<tr><th scope="row">${r.label}</th><td>${r.a}</td><td>${r.b}</td></tr>`)}
          <tr><th scope="row">${L.metrics.lcp}</th><td>${secs(cur.median.lcp_ms)} sn</td><td>${secs(demo.median.lcp_ms)} sn</td></tr>
          <tr><th scope="row">${L.metrics.weight}</th><td>${mb(cur.median.total_kb)} MB</td><td>${mb(demo.median.total_kb)} MB</td></tr>
        </tbody>
      </table>
    </details>
    <p class="lh__seo">${seoNote(cur, demo)}</p>
    <p class="note">${fill(L.method, { v: demo.lighthouse_version, date: demo.date.split("-").reverse().join("."), runs: demo.runs })}</p>
    <p class="tip" role="tooltip" hidden data-tip-box></p>
  </figure>`;
}

// ─── Panel temsilî ekranları (onlinemenu-qr kimliğinde; markanın sayfasından ayrışsın) ─────────────
function mockFrame(title: string, body: Raw): Raw {
  const M = S.panel.mock;
  return html`<div class="pm">
    <div class="pm__bar">
      <span class="pm__brand">${omqrGlyph(18)}<span>onlinemenu-qr · Panel</span></span>
      <span class="pm__crumb">Coffee House · ${title}</span>
      <span class="pm__scope">${M.allBranches}${icons.chevronDown()}</span>
    </div>
    <div class="pm__body">${body}</div>
  </div>`;
}

function mockCatalog(d: BriefData): Raw {
  const M = S.panel.mock;
  return mockFrame(S.panel.shots.catalog.tab, html`
    <div class="pm__tools"><span class="pm__search">${M.search}</span><span class="pm__btn">+ ${M.product}</span></div>
    <table class="pm__table">
      <thead><tr><th>${M.product}</th><th>${M.category}</th><th>${M.branches}</th><th>${M.status}</th></tr></thead>
      <tbody>${d.catalogRows.map((r) => html`<tr><td><b>${r.name}</b>${r.badge ? html` <span class="pm__badge">${r.badge}</span>` : ""}</td><td>${r.category}</td><td>${r.branches}</td><td><span class="pm__ok">${M.published}</span></td></tr>`)}</tbody>
    </table>`);
}

function mockRules(): Raw {
  const M = S.panel.mock;
  const values = [M.locked, M.locked, M.bounded, M.allowed, M.locked];
  return mockFrame(S.panel.shots.rules.tab, html`
    <table class="pm__table pm__table--rules">
      <thead><tr><th>${M.field}</th><th>${M.branchCan}</th></tr></thead>
      <tbody>${M.fields.map((f, i) => html`<tr><td>${f}</td><td><span class="pm__seg">${[M.locked, M.bounded, M.allowed].map((v) => html`<span${attrs({ class: v === values[i] ? "is-on" : null })}>${v === M.locked ? icons.lock() : ""}${v}</span>`)}</span></td></tr>`)}</tbody>
    </table>`);
}

function mockPrices(d: BriefData): Raw {
  const M = S.panel.mock;
  return mockFrame(S.panel.shots.prices.tab, html`
    <p class="pm__title">Cappuccino</p>
    <table class="pm__table pm__table--prices">
      <thead><tr><th>${M.branches}</th><th>${M.tier}</th>${d.priceSizes.map((s) => html`<th>${s}</th>`)}</tr></thead>
      <tbody>${d.priceRows.map((r) => html`<tr><td><b>${r.branch}</b> <span class="pm__muted">${r.brand} · ${r.currency}</span></td><td>${r.tier}</td>${r.prices.map((p) => html`<td class="num">${p}</td>`)}</tr>`)}</tbody>
    </table>`);
}

function mockPreview(): Raw {
  const M = S.panel.mock;
  return mockFrame(S.panel.shots.preview.tab, html`
    <div class="pm__preview">
      <div class="pm__phone" aria-hidden="true">
        <span class="pm__phone-head">LALELİ</span>
        ${["Cappuccino", "Iced Latte", "Çilekli Matcha"].map((n, i) => html`<span class="pm__phone-row"><span class="pm__phone-img" style="${`--i:${i}`}"></span><span>${n}</span></span>`)}
      </div>
      <div class="pm__publish">
        <p>${M.draft}</p>
        <span class="pm__btn pm__btn--lime">${M.save}</span>
      </div>
    </div>`);
}

export function renderBrief(d: BriefData, a: BriefAssets): string {
  const P = S.panel;
  const findLinks: Record<string, string> = {
    form: paths.site("franchising", "tr") + "#basvuru",
    menu: paths.menuIndex(),
    branches: paths.site("branches", "tr"),
    arabic: paths.site("home", "ar"),
    site: paths.site("home", "tr"),
    lighthouse: "#olcum",
  };
  const cur = d.current;
  const capIcon = (name: string) => (icons as Record<string, () => Raw>)[name]();
  const sections = S.nav.sections;
  const tabs = [
    { id: "catalog", s: P.shots.catalog, body: mockCatalog(d) },
    { id: "rules", s: P.shots.rules, body: mockRules() },
    { id: "prices", s: P.shots.prices, body: mockPrices(d) },
    { id: "preview", s: P.shots.preview, body: mockPreview() },
  ];

  const body = html`
<a class="skip" href="#neden">${strings.tr.common.skip}</a>
<div class="progress" aria-hidden="true"><span data-progress></span></div>

<main>
<section class="slide slide--cover" id="kapak" data-title="${sections[0]}" aria-labelledby="h-cover">
  <svg class="cover__ring" viewBox="${a.ring.viewBox}" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="${a.ring.d}"/></svg>
  <div class="wrap cover">
    <p class="cover__brands">
      <img src="${a.logo}" alt="Coffee House" width="88" height="88">
      <span class="cover__x" aria-hidden="true">×</span>
      <span class="omqr">${omqrGlyph(30)}<span>onlinemenu<span class="omqr__qr">-qr</span></span></span>
    </p>
    <h1 class="cover__title" id="h-cover">${S.cover.title}</h1>
    <p class="cover__lead">${S.cover.lead}</p>
    <p class="cover__date">${S.cover.date}</p>
    <a class="btn btn--ink cover__cta" href="#neden">${S.cover.cta}${icons.arrowDown()}</a>
  </div>
</section>

<section class="slide" id="neden" data-title="${sections[1]}" aria-labelledby="h-why">
  <div class="wrap why">
    <div class="why__text">
      ${sectionHead(1, S.why.eyebrow, S.why.title, "h-why")}
      ${S.why.body.map((p) => html`<p class="why__p">${p}</p>`)}
      <dl class="facts">${S.why.facts.map((f) => html`<div><dt>${f.k}</dt><dd>${f.v}</dd></div>`)}</dl>
    </div>
    <figure class="why__photo">
      ${pic(a.facade, a.facadeAlt, "(min-width: 64rem) 420px, (min-width: 40rem) 45vw, 100vw", "why__pic")}
      <figcaption>${S.why.photoCredit}</figcaption>
    </figure>
  </div>
</section>

<section class="slide slide--latte" id="firsatlar" data-title="${sections[2]}" aria-labelledby="h-find">
  <div class="wrap">
    ${sectionHead(2, S.findings.eyebrow, S.findings.title, "h-find", S.findings.lead)}
    <ol class="finds" role="list">
      ${S.findings.items.map((f, i) => {
        const now = cur ? fill(f.now, { lcp: secs(cur.median.lcp_ms), mb: mb(cur.median.total_kb) }) : f.now;
        return html`<li class="find">
          <p class="find__n" aria-hidden="true">${num(i)}</p>
          <h3 class="find__t">${f.title}</h3>
          <dl class="find__dl">
            <div><dt>${S.findings.labels.now}</dt><dd>${now}</dd></div>
            <div><dt>${S.findings.labels.impact}</dt><dd>${f.impact}</dd></div>
            <div class="find__fix"><dt>${S.findings.labels.fix}</dt><dd>${f.fix}</dd></div>
          </dl>
          <a class="link" href="${findLinks[f.link]}">${S.findings.labels.see}: ${(S.findings.links as Record<string, string>)[f.link]}${icons.arrow()}</a>
        </li>`;
      })}
    </ol>
    <div id="olcum" class="olcum">
      ${cur && d.demo ? lighthouseFigure(cur, d.demo) : html`<p class="note">${S.lighthouse.pending}</p>`}
    </div>
  </div>
</section>

<section class="slide" id="panel" data-title="${sections[3]}" aria-labelledby="h-panel">
  <div class="wrap">
    ${sectionHead(3, P.eyebrow, P.title, "h-panel", P.lead)}
    <div class="caps">
      <div class="caps__group caps__group--today">
        <h3 class="caps__h"><span class="tag tag--today">${icons.check()}${P.todayTitle}</span></h3>
        <ul class="caps__list" role="list">${P.today.map((c) => html`<li class="cap">${capIcon(c.icon)}<h4>${c.title}</h4><p>${c.body}</p></li>`)}</ul>
      </div>
      <div class="caps__group caps__group--scope">
        <h3 class="caps__h"><span class="tag tag--scope">${icons.sparkle()}${P.scopeTitle}</span></h3>
        <ul class="caps__list" role="list">${P.scope.map((c) => html`<li class="cap">${capIcon(c.icon)}<h4>${c.title}</h4><p>${c.body}</p></li>`)}</ul>
        <p class="note">${P.scopeNote}</p>
      </div>
    </div>

    <div class="shots" data-tabs>
      <div class="shots__tabs" role="tablist" aria-label="${P.title}">
        ${tabs.map((t, i) => html`<button class="shots__tab" type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0 ? "true" : "false"}"${raw(i === 0 ? "" : ' tabindex="-1"')}>${t.s.tab}</button>`)}
      </div>
      ${tabs.map((t, i) => html`<div class="shots__panel" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}" tabindex="0"${raw(i === 0 ? "" : " hidden")}>
        ${t.body}
        <p class="shots__cap">${t.s.caption}</p>
      </div>`)}
      <p class="note">${P.shots.note}</p>
    </div>
    <p class="panel__cta"><a class="btn btn--solid" href="${paths.menuIndex()}">${P.cta}${icons.arrow()}</a></p>
  </div>
</section>

<section class="slide slide--night" id="demolar" data-title="${sections[4]}" aria-labelledby="h-demos">
  <div class="wrap">
    ${sectionHead(4, S.demos.eyebrow, S.demos.title, "h-demos")}
    <ul class="demos" role="list">
      <li class="demo">
        <div class="demo__art demo__art--menu" aria-hidden="true">
          ${a.bubbles.map((b, i) => pic(b, "", "(min-width: 48rem) 180px, 34vw", `demo__bubble demo__bubble--${i}`))}
        </div>
        <h3>${S.demos.menu.title}</h3>
        <p>${S.demos.menu.body}</p>
        <p class="demo__meta">${fill(S.demos.menu.meta, d.counts)}</p>
        <a class="btn btn--light" href="${paths.menuIndex()}">${S.demos.menu.cta}${icons.arrow()}</a>
      </li>
      <li class="demo">
        <div class="demo__art demo__art--site" aria-hidden="true">
          <span class="demo__porthole">${pic(a.poster, "", "(min-width: 48rem) 260px, 50vw")}</span>
        </div>
        <h3>${S.demos.site.title}</h3>
        <p>${S.demos.site.body}</p>
        <p class="demo__meta">${S.demos.site.meta}</p>
        <a class="btn btn--light" href="${paths.site("home", "tr")}">${S.demos.site.cta}${icons.arrow()}</a>
      </li>
    </ul>
    <p class="note note--night">${S.demos.note}</p>
  </div>
</section>

<section class="slide" id="ilerleyis" data-title="${sections[5]}" aria-labelledby="h-steps">
  <div class="wrap">
    ${sectionHead(5, S.steps.eyebrow, S.steps.title, "h-steps")}
    <ol class="steps" role="list">
      ${S.steps.items.map((s, i) => html`<li class="step"><span class="step__n" aria-hidden="true">${num(i)}</span><h3>${s.title}</h3><p>${s.body}</p></li>`)}
    </ol>
    <p class="note">${S.steps.note}</p>
  </div>
</section>

<section class="slide slide--blue" id="donus" data-title="${sections[6]}" aria-labelledby="h-close">
  <div class="wrap close">
    ${sectionHead(6, S.close.eyebrow, S.close.title, "h-close")}
    <p class="close__body">${S.close.body}</p>
    <a class="btn btn--ink btn--xl" href="${`mailto:${OFFER_EMAIL}?subject=${encodeURIComponent(OFFER_SUBJECT)}`}">${icons.mail()}${S.close.button}</a>
    <div class="close__mail">
      <span class="close__label">${S.close.emailLabel}</span>
      <span class="close__addr" data-email>${OFFER_EMAIL}</span>
      <button class="close__copy" type="button" data-copy data-copied="${S.close.copied}">${icons.copy()}<span>${S.close.copy}</span></button>
    </div>
    <p class="close__sig">${omqrGlyph(26)}<span><b>${brandText("onlinemenu-qr.com")}</b> · ${S.close.signature}</span></p>
  </div>
</section>
</main>

<nav class="snav" aria-label="${S.nav.label}" data-snav>
  <button class="snav__btn" type="button" data-go="-1" aria-label="${S.nav.prev}">${icons.arrowDown()}</button>
  <span class="snav__pos"><b data-snav-n>01</b> / ${num(sections.length - 1)} <span data-snav-t>${sections[0]}</span></span>
  <button class="snav__btn" type="button" data-go="1" aria-label="${S.nav.next}">${icons.arrowDown()}</button>
  <span class="snav__keys">${S.nav.keys}</span>
</nav>`;

  return renderDocument({
    locale: "tr",
    dir: "ltr",
    title: S.meta.title,
    description: S.meta.description,
    selfUrl: paths.brief(),
    ogLocale: "tr_TR",
    og: { image: a.og.url, width: a.og.width, height: a.og.height, alt: S.meta.ogAlt, siteName: "onlinemenu-qr.com" },
    themeColor: "#FFFFFF",
    css: a.css,
    scripts: [a.js],
    preloads: a.fonts,
    bodyAttrs: { class: "page-brief" },
  }, body);
}
