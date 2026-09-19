/**
 * Tek sayfa şablonu: hero → yapışkan şube/dil/kategori çubuğu → şube kartı → menü → karşılaştırma →
 * franchise bölümü → footer → sabit demo şeridi. Her şube × dil için ayrı statik dosya üretilir.
 */
import { BASE, SITE, paths } from "../config";
import { imageWidths } from "../data/central/products";
import type { ResolvedCategory } from "../data/resolve";
import { LOCALES, pick, type BranchBundle, type Locale } from "../data/schema";
import { fill, strings } from "../i18n";
import { formatPrice, telHref, weekdayName } from "../shared/format";
import { displayTime } from "../shared/hours";
import type { ClientBranch, ClientState } from "../shared/state";
import { attrs, html, raw, type Raw } from "./html";
import { fleur, icons } from "./icons";

export interface Assets {
  css: string;
  js: string;
  logo: { src: string; width: number; height: number };
  fonts: Record<Locale, string[]>;
  hero: { avif: string; webp: string; fallback: string; sizes: string; width: number; height: number };
  og: { url: string; width: number; height: number };
}

/** scripts/measure.ts çıktısı. Yoksa teknik şerit hiç basılmaz — ölçülmemiş sayı yazılmaz. */
export interface Measurement {
  lighthouse_version: string;
  date: string;
  performance: number;
  accessibility: number;
  best_practices: number;
  lcp_ms: number;
  initial_kb: number;
}

export interface CompareRow { product_id: string; name: string; central: number; cells: { slug: string; price: number; availability: string }[] }

export interface PageInput {
  locale: Locale;
  /** true → kök giriş sayfası (varsayılan şube); false → /sube/<slug> */
  entry: boolean;
  current: BranchBundle;
  branches: BranchBundle[];
  menus: Map<string, ResolvedCategory[]>;
  central: ResolvedCategory[];
  compare: CompareRow[];
  domesticCount: number;
  measurement: Measurement | null;
  assets: Assets;
}

const shortName = (name: string) => name.replace(/\s+Şube(si)?$/u, "");
const PRODUCT_SIZES = "(min-width: 64rem) 270px, (min-width: 40rem) 31vw, 47vw";

export function clientBranch(b: BranchBundle, menu: ResolvedCategory[], locale: Locale): ClientBranch {
  const t = strings[locale];
  const items = menu.flatMap((c) => c.items);
  const name = pick(b.branch.name_i18n, locale);
  return {
    slug: b.branch.slug,
    name,
    city: pick(b.branch.city_i18n, locale),
    kind: t.kind[b.branch.kind],
    address: b.branch.address,
    phone: b.branch.phone,
    tel: telHref(b.branch.phone),
    tz: b.branch.timezone,
    hours: b.branch.hours,
    url: Object.fromEntries(LOCALES.map((l) => [l, paths.branch(l, b.branch.slug)])) as Record<Locale, string>,
    title: fill(t.title, { branch: name }),
    prices: items.map((i) => i.variants[0].price_minor),
    avail: items.map((i) => (i.availability === "available" ? "a" : i.availability === "sold_out" ? "s" : "h")).join(""),
    flags: items.map((i) => (i.variants.some((v) => v.source === "branch_delta" || v.source === "branch_fixed") ? "1" : "0")).join(""),
    tier: b.branch.price_adjust_pct === 0
      ? t.tierCentral
      : fill(t.tier, { sign: b.branch.price_adjust_pct > 0 ? "+" : "−", n: Math.abs(b.branch.price_adjust_pct) }),
  };
}

function hoursRows(b: ClientBranch, locale: Locale): Raw {
  return html`${[1, 2, 3, 4, 5, 6, 7].map((wd) => {
    const h = b.hours.find((x) => x.weekday === wd);
    return html`<tr data-weekday="${wd}"><th scope="row">${weekdayName(wd, locale)}</th><td>${h ? html`<bdi>${h.opens}–${displayTime(h.closes)}</bdi>` : strings[locale].closedNoHours}</td></tr>`;
  })}`;
}

/** İlk ekrandaki kartlar yerel lazy yüklemeyle gelir; gerisi JS'in dar mesafeli gözlemcisiyle (bkz. client/app.ts). */
const NATIVE_LAZY_CARDS = 4;

/**
 * Yerel loading="lazy" mobilde ~1250–2500 px önden yükler → ilk açılışta ~20 ürün görseli (~400 KB) iner.
 * İlk yükleme bütçesi (500 KB) için ilk NATIVE_LAZY_CARDS kart dışındakiler data-* ile basılır; JS yoksa <noscript> yedeği.
 */
function picture(key: string, alt: string, native: boolean): Raw {
  const widths = imageWidths(key);
  const set = (ext: string) => widths.map((w) => `${paths.product(`urunler/${key}-${w}.${ext}`)} ${w}w`).join(", ");
  const w0 = widths[0];
  const fallback = paths.product(`urunler/${key}-${w0}.webp`);
  const dims = { width: w0, height: Math.round(w0 * 1.25) };
  if (native) {
    return html`<picture>
      <source type="image/avif" srcset="${set("avif")}" sizes="${PRODUCT_SIZES}">
      <source type="image/webp" srcset="${set("webp")}" sizes="${PRODUCT_SIZES}">
      <img src="${fallback}" alt="${alt}"${attrs(dims)} loading="lazy" decoding="async">
    </picture>`;
  }
  return html`<picture data-lazy>
    <source type="image/avif" data-srcset="${set("avif")}" sizes="${PRODUCT_SIZES}">
    <source type="image/webp" data-srcset="${set("webp")}" sizes="${PRODUCT_SIZES}">
    <img data-src="${fallback}" alt="${alt}"${attrs(dims)} loading="lazy" decoding="async">
  </picture><noscript><img src="${fallback}" alt="${alt}"${attrs(dims)} loading="lazy" decoding="async"></noscript>`;
}

export function renderPage(p: PageInput): string {
  const { locale, current, assets: a } = p;
  const t = strings[locale];
  const cb = clientBranch(current, p.menus.get(current.branch.slug)!, locale);
  const selfUrl = p.entry ? paths.entry(locale) : cb.url[locale];
  const alternates = Object.fromEntries(LOCALES.map((l) => [l, p.entry ? paths.entry(l) : cb.url[l]])) as Record<Locale, string>;
  const hiddenCount = [...cb.avail].filter((x) => x === "h").length;

  const state: ClientState = {
    locale,
    entry: p.entry,
    branches: p.branches.map((b) => clientBranch(b, p.menus.get(b.branch.slug)!, locale)),
    t: {
      openNow: t.openNow, closedNow: t.closedNow, closedNoHours: t.closedNoHours,
      tomorrow: t.tomorrow, today: t.today, hiddenHere: t.hiddenHere, switched: t.switched,
    },
  };

  // Kart sırası = merkez menü sırası; her şube aynı indeksleri kullanır (prices / avail)
  let index = 0;
  const menu = p.central.map((cat) => html`
    <section class="cat" id="${cat.category.slug}" aria-labelledby="h-${cat.category.slug}">
      <header class="cat__head">
        <h2 id="h-${cat.category.slug}">${cat.category.name_i18n[locale]}</h2>
        <p class="note">${t.pricesNote}</p>
      </header>
      <ul class="grid" role="list">
        ${cat.items.map((item) => {
          const i = index++;
          const name = pick(item.product.name_i18n, locale);
          const price = cb.prices[i], state = cb.avail[i];
          const cls = ["card", state === "s" && "is-sold", cb.flags[i] === "1" && "is-diff"].filter(Boolean).join(" ");
          return html`<li${attrs({ class: cls, "data-i": i, hidden: state === "h" })}>
            <div class="card__media">${item.product.image_key ? picture(item.product.image_key, name, i < NATIVE_LAZY_CARDS) : ""}<span class="card__sold" aria-hidden="true">${t.soldOut}</span></div>
            <div class="card__body">
              <h3 class="card__name"><bdi>${name}</bdi></h3>
              <p class="card__price"><span class="price" data-price>${formatPrice(price, locale)}</span><span class="sold">${t.soldOut}</span><span class="flag" title="${t.branchPriceTitle}">${t.branchPrice}</span></p>
            </div>
          </li>`;
        })}
      </ul>
    </section>`);

  const branchList = html`<ul class="blist" role="list">
    ${state.branches.map((b) => html`<li>
      <a class="blist__link" href="${b.url[locale]}" data-slug="${b.slug}"${raw(b.slug === cb.slug ? ' aria-current="page"' : "")}>
        <span class="blist__name"><bdi>${b.name}</bdi></span>
        <span class="blist__meta">${b.city} · ${b.kind}</span>
        <span class="blist__status" data-status-for="${b.slug}"></span>
        <span class="blist__check">${icons.check()}</span>
      </a>
    </li>`)}
  </ul>`;

  const compare = html`<section class="compare" aria-labelledby="h-compare">
    <div class="wrap">
      <div class="divider">${fleur()}</div>
      <h2 id="h-compare">${t.compareTitle}</h2>
      <p class="lead">${t.compareLead}</p>
      <p class="note">${t.pricesNote}</p>
      <div class="table-scroll" tabindex="0" role="region" aria-labelledby="h-compare">
        <table class="ctable">
          <thead><tr>
            <th scope="col">${t.compareProduct}</th>
            <th scope="col" class="ctable__central">${t.compareCentral}</th>
            ${p.branches.map((b) => html`<th scope="col" data-col="${b.branch.slug}"${raw(b.branch.slug === cb.slug ? ' class="is-current"' : "")}><bdi>${shortName(pick(b.branch.name_i18n, locale))}</bdi></th>`)}
          </tr></thead>
          <tbody>
            ${p.compare.map((row) => html`<tr>
              <th scope="row"><bdi>${row.name}</bdi></th>
              <td class="ctable__central">${formatPrice(row.central, locale)}</td>
              ${row.cells.map((c) => html`<td data-col="${c.slug}" class="${[
                c.slug === cb.slug && "is-current",
                c.availability === "available" && c.price !== row.central && "is-diff",
                c.availability !== "available" && "is-off",
              ].filter(Boolean).join(" ")}">${c.availability === "hidden" ? t.compareHidden : c.availability === "sold_out" ? t.soldOut : formatPrice(c.price, locale)}</td>`)}
            </tr>`)}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;

  const m = p.measurement;
  const tech = m
    ? html`<div class="tech" role="group" aria-labelledby="h-tech">
        <h3 id="h-tech" class="tech__title">${t.techTitle}</h3>
        <dl class="tech__grid">
          <div class="tech__item tech__item--wide"><dt>${t.techLighthouse}</dt><dd>
            <span class="score"><b>${m.performance}</b> ${t.techPerf}</span>
            <span class="score"><b>${m.accessibility}</b> ${t.techA11y}</span>
            <span class="score"><b>${m.best_practices}</b> ${t.techBp}</span>
          </dd></div>
          <div class="tech__item"><dt>${t.techLcp}</dt><dd><b><bdi>${(m.lcp_ms / 1000).toFixed(1)} s</bdi></b></dd></div>
          <div class="tech__item"><dt>${t.techWeight}</dt><dd><b><bdi>${Math.round(m.initial_kb)} KB</bdi></b></dd></div>
        </dl>
        <p class="tech__method">${fill(t.techMethod, { v: m.lighthouse_version, date: m.date })}</p>
      </div>`
    : "";

  const pitchIcons = [icons.layers, icons.store, icons.globe, icons.qr];
  const pitch = html`<section class="pitch" aria-labelledby="h-pitch">
    <div class="wrap">
      <div class="divider">${fleur()}</div>
      <p class="eyebrow">${t.pitchEyebrow}</p>
      <h2 id="h-pitch">${fill(t.pitchTitle, { n: p.domesticCount })}</h2>
      <p class="lead">${t.pitchLead}</p>
      <ul class="pitch__list" role="list">
        ${t.pitchItems.map((it, i) => html`<li class="pitch__item">${pitchIcons[i]()}<h3>${it.title}</h3><p>${it.body}</p></li>`)}
      </ul>
      ${tech}
      <p class="pitch__cta"><a class="btn" href="https://onlinemenu-qr.com" rel="noopener">${t.cta}${icons.arrow()}</a></p>
    </div>
  </section>`;

  const body = html`
<a class="skip" href="#menu">${t.skip}</a>
<header class="hero">
  <picture class="hero__media">
    <source type="image/avif" srcset="${a.hero.avif}" sizes="${a.hero.sizes}">
    <source type="image/webp" srcset="${a.hero.webp}" sizes="${a.hero.sizes}">
    <img src="${a.hero.fallback}" alt="" width="${a.hero.width}" height="${a.hero.height}" fetchpriority="high" loading="eager" decoding="async">
  </picture>
  <a class="demo-badge" href="https://onlinemenu-qr.com" rel="noopener" title="${t.demoBadgeTitle}"><span class="demo-badge__dot" aria-hidden="true"></span>${t.demoBadge} — onlinemenu-qr.com</a>
  <p class="hero__caption">${t.heroCaption}</p>
  <div class="hero__brand wrap">
    <h1 class="hero__title"><img class="logo" src="${a.logo.src}" alt="Kahve Deryası" width="${a.logo.width}" height="${a.logo.height}" decoding="async"><span class="hero__sub">${t.qrMenu}</span></h1>
  </div>
</header>

<div class="bar" data-bar>
  <div class="bar__row wrap">
    <button class="bsel" type="button" popovertarget="branches" aria-haspopup="dialog">
      <span class="bsel__label">${t.branchLabel}</span>
      <span class="bsel__name"><bdi data-b="name">${cb.name}</bdi></span>
      ${icons.chevronDown()}
    </button>
    <nav class="lang" aria-label="${t.langNav}">
      ${LOCALES.map((l) => l === locale
        ? html`<span class="lang__opt" aria-current="true" lang="${l}">${strings[l].localeShort}<span class="sr-only"> ${strings[l].localeName}</span></span>`
        : html`<a class="lang__opt" href="${alternates[l]}" hreflang="${l}" lang="${l}" data-lang="${l}">${strings[l].localeShort}<span class="sr-only"> ${strings[l].localeName}</span></a>`)}
    </nav>
  </div>
  <nav class="cats" aria-label="${t.categoriesNav}">
    <ul class="cats__list wrap" role="list">
      ${p.central.map((c, i) => html`<li><a class="cats__link" href="#${c.category.slug}"${raw(i === 0 ? ' aria-current="true"' : "")}>${c.category.name_i18n[locale]}</a></li>`)}
    </ul>
  </nav>
</div>

<div id="branches" class="sheet" popover role="dialog" aria-labelledby="h-branches">
  <div class="sheet__head">
    <div>
      <h2 id="h-branches">${t.branchesTitle}</h2>
      <p class="note">${t.branchesNote}</p>
    </div>
    <button class="icon-btn" type="button" popovertarget="branches" popovertargetaction="hide" aria-label="${t.branchChange}">${icons.close()}</button>
  </div>
  <p class="sheet__scale">${fill(t.scale, { n: p.domesticCount })}</p>
  ${branchList}
</div>

<main id="menu" tabindex="-1">
  <section class="branch wrap" aria-labelledby="h-branch">
    <div class="branch__top">
      <div>
        <h2 id="h-branch" class="branch__name"><bdi data-b="name">${cb.name}</bdi></h2>
        <p class="branch__meta"><span data-b="city">${cb.city}</span> · <span data-b="kind">${cb.kind}</span></p>
      </div>
      <p class="status is-pending" data-open-status>${raw("&#8203;")}</p>
    </div>
    <p class="note">${t.branchesNote}</p>
    <dl class="branch__facts">
      <div>${icons.pin()}<dt class="sr-only">${t.address}</dt><dd data-b="address">${cb.address}</dd></div>
      <div>${icons.phone()}<dt class="sr-only">${t.phone}</dt><dd><a data-b="phone" href="${cb.tel}"><bdi>${cb.phone}</bdi></a></dd></div>
    </dl>
    <details class="hours">
      <summary>${icons.clock()}<span>${t.hoursTitle}</span>${icons.chevronDown()}</summary>
      <table class="hours__table"><tbody data-b="hours">${hoursRows(cb, locale)}</tbody></table>
    </details>
    <p class="branch__tier" data-b="tier">${cb.tier}</p>
    <p class="branch__hidden" data-hidden-note${raw(hiddenCount ? "" : " hidden")}>${fill(t.hiddenHere, { n: hiddenCount })}</p>
  </section>
  <div class="wrap menu">${menu}</div>
  ${compare}
</main>
${pitch}
<footer class="foot">
  <div class="wrap">
    <p class="foot__rights">${t.rights}</p>
  </div>
</footer>
<p class="demo-strip" data-strip>${t.strip}</p>
<p class="sr-only" aria-live="polite" data-live></p>
<script type="application/json" id="state">${raw(JSON.stringify(state).replace(/</g, "\\u003c"))}</script>`;

  return document({ locale, title: cb.title, description: t.description, selfUrl, alternates, entry: p.entry }, a, body);
}


interface Meta { locale: Locale; title: string; description: string; selfUrl: string; alternates: Record<Locale, string>; entry: boolean }

function document(meta: Meta, a: Assets, body: Raw): string {
  const t = strings[meta.locale];
  // CSP: ortak _headers politikasına ek olarak sayfa düzeyinde daraltma — iki politika birlikte uygulanır,
  // sonuçta img-src yalnızca 'self' (data: bile yok). frame-ancestors meta'da desteklenmez; _headers'ta var.
  const csp = "default-src 'self'; img-src 'self'; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";
  return `<!doctype html>${html`<html lang="${t.htmlLang}" dir="${t.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="robots" content="noindex, nofollow">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<meta name="theme-color" content="#0E0C0F">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kahve Deryası · QR Menü — DEMO">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${t.strip}">
<meta property="og:url" content="${SITE + meta.selfUrl}">
<meta property="og:locale" content="${t.ogLocale}">
<meta property="og:image" content="${SITE + a.og.url}">
<meta property="og:image:width" content="${a.og.width}">
<meta property="og:image:height" content="${a.og.height}">
<meta property="og:image:alt" content="Kahve Deryası logosu — QR menü demosu, onlinemenu-qr.com">
<meta name="twitter:card" content="summary_large_image">
${LOCALES.map((l) => html`<link rel="alternate" hreflang="${l}" href="${SITE + meta.alternates[l]}">\n`)}
<link rel="icon" href="${paths.asset("icon-32.png")}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${paths.asset("apple-touch-icon.png")}">
<link rel="preload" as="image" type="image/avif" imagesrcset="${a.hero.avif}" imagesizes="${a.hero.sizes}" fetchpriority="high">
${a.fonts[meta.locale].map((f) => html`<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>\n`)}
<style>${raw(a.css)}</style>
<noscript><style>picture[data-lazy]{display:none}</style></noscript>
<script type="module" src="${a.js}"></script>
</head>
<body data-base="${BASE}">
${body}
</body>
</html>`.value}\n`;
}
