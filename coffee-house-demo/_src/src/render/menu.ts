/**
 * QR menü: şube sayfası (/menu/<şube>/, /menu/<şube>/<dil>) ve şube seçici (/menu/).
 *
 * Sayfa sırası: başlık (marka + şube + durum) → yapışkan kategori sekmeleri → ürün listesi → şube bilgisi →
 * "panelden yönetilir" notu → footer → sabit demo çubuğu (sunuma dön · örnek menü · şube farkları).
 * Her şube × dil ayrı statik dosyadır; şube değişimi istemcide sayfa yenilemeden uygulanır (client/menu.ts).
 */
import { LOCALES, paths, type Locale } from "../config";
import type { ResolvedCategory, ResolvedProduct } from "../data/resolve";
import { pick, type BranchBundle, type Category, type Product } from "../data/schema";
import { fill, strings } from "../i18n";
import { formatPrice, weekdayName } from "../shared/format";
import { displayTime } from "../shared/hours";
import type { ClientBranch, MenuClientStrings, MenuState } from "../shared/state";
import { jsonScript, renderDocument, type Preload } from "./document";
import { attrs, brandText, html, raw, type Raw } from "./html";
import { allergenIcon, categoryIcon, icons, omqrGlyph } from "./icons";

export const BRAND_NAME = { "coffee-house": "Coffee House", "coffee-art": "Coffee Art" } as const;

/** Her demo sayfasında sabit, küçük "← Sunuma dön" bağlantısı (brief §4.5) — site de kullanır */
export const backPill = (label: string): Raw =>
  html`<a class="back-pill" href="${paths.brief()}">${icons.arrowBack()}<span>${label}</span></a>`;

export interface ProductImage { avif: string; webp: string; src: string; w: number }

export interface MenuAssets {
  css: string;
  js: string;
  logo: string;
  fonts: Record<Locale, Preload[]>;
  og: { url: string; width: number; height: number };
  images: Map<string, ProductImage>;
  /** şube slug'ı → karekod SVG'si (seçici sayfası) */
  qr: Map<string, string>;
  version: string;
}

export interface BranchMenu { bundle: BranchBundle; items: (ResolvedProduct | null)[] }
export interface MenuModel { cards: Product[]; categories: Category[]; branches: BranchMenu[] }

/** Kart dizisi: kategori sırası → ürün sırası; şubeye özel ürünler kendi kategorisinde, merkez ürünlerinden sonra. */
export function menuModel(categories: Category[], central: Product[], bundles: BranchBundle[], resolved: Map<string, ResolvedCategory[]>): MenuModel {
  const all = [...central, ...bundles.flatMap((b) => b.products)].sort((a, b) => a.sort_order - b.sort_order);
  const cards = [...categories].sort((a, b) => a.sort_order - b.sort_order).flatMap((c) => all.filter((p) => p.category_id === c.id));
  return {
    cards,
    categories,
    branches: bundles.map((bundle) => {
      const byId = new Map(resolved.get(bundle.branch.slug)!.flatMap((c) => c.items).map((i) => [i.product.id, i]));
      return { bundle, items: cards.map((p) => byId.get(p.id) ?? null) };
    }),
  };
}

const THUMB_SIZES = "(min-width: 48rem) 112px, 92px";

function mapsUrl(b: BranchBundle["branch"]): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address_i18n.tr)}`;
}

function clientStrings(locale: Locale): MenuClientStrings {
  const t = strings[locale].menu, c = strings[locale].common;
  return {
    openNow: t.openNow, closedNow: t.closedNow, closedNoHours: t.closedNoHours, today: t.today, tomorrow: t.tomorrow,
    hiddenHere: t.hiddenHere, switched: t.switched, soldOut: t.soldOut, new: t.new, campaign: t.campaign,
    branchOnly: t.branchOnly, was: t.was, sizes: t.sizes, ml: t.ml, allergens: t.allergens, noAllergens: t.noAllergens,
    allergenNote: t.allergenNote, diffCentral: t.diffCentral, diffSummary: t.diffSummary, close: c.close,
  };
}

export function clientBranch(bm: BranchMenu, locale: Locale): ClientBranch {
  const t = strings[locale].menu;
  const b = bm.bundle.branch;
  const name = pick(b.name_i18n, locale);
  const pct = b.price_adjust_pct;
  return {
    slug: b.slug,
    brand: b.brand,
    brandName: BRAND_NAME[b.brand],
    name,
    city: pick(b.city_i18n, locale),
    address: pick(b.address_i18n, locale),
    tz: b.timezone,
    hours: b.hours,
    currency: b.currency,
    url: Object.fromEntries(LOCALES.map((l) => [l, paths.menu(b.slug, l, b.default_locale)])) as Record<Locale, string>,
    title: fill(t.title, { brand: BRAND_NAME[b.brand], branch: name }),
    tier: pct === 0 ? t.tierCentral : fill(t.tier, { sign: pct > 0 ? "+" : "−", n: Math.abs(pct) }),
    maps: mapsUrl(b),
    p: bm.items.map((i) => (i ? i.variants.map((v) => v.price_minor) : [])),
    r: bm.items.map((i) => (i ? i.variants.map((v) => v.regular_minor) : [])),
    cp: bm.items.map((i) => (i ? i.variants.map((v) => v.central_minor) : [])),
    a: bm.items.map((i) => (!i ? "h" : i.availability === "available" ? "a" : i.availability === "sold_out" ? "s" : "h")).join(""),
    // z: başka şubenin özel ürünü — bu şubenin kataloğunda hiç yok ("sunulmuyor" sayısına girmez)
    f: bm.items.map((i) => (!i ? "z" : i.branch_only ? "o" : i.campaign ? "c" : i.price_differs ? "x" : "-")).join(""),
  };
}

/** Bu şubede sunulmayan ürün sayısı (başka şubelerin özel ürünleri hariç) — istemci aynı kuralı uygular. */
export const hiddenCount = (cb: ClientBranch) => [...cb.a].filter((x, i) => x === "h" && cb.f[i] !== "z").length;

function picture(key: string, alt: string, a: MenuAssets, sizes: string, eager = false): Raw {
  const img = a.images.get(key);
  if (!img) throw new Error(`ürün görseli üretilmemiş: ${key}`);
  return html`<picture>
    <source type="image/avif" srcset="${img.avif}" sizes="${sizes}">
    <source type="image/webp" srcset="${img.webp}" sizes="${sizes}">
    <img src="${img.src}" alt="${alt}" width="${img.w}" height="${img.w}"${raw(eager ? "" : ' loading="lazy"')} decoding="async">
  </picture>`;
}

/** Marka işaretleri: iki marka da sayfada, hangisinin görüneceğine html[data-brand] karar verir (şube değişince). */
function brandMarks(a: MenuAssets): Raw {
  return html`<img class="logo logo--ch" src="${a.logo}" alt="Coffee House" width="64" height="64">
    <span class="logo logo--ca" role="img" aria-label="Coffee Art"><span class="ca-mark"><span>Coffee</span><span>Art</span></span></span>`;
}

function langNav(cb: ClientBranch, locale: Locale): Raw {
  const t = strings[locale].common;
  return html`<nav class="lang" aria-label="${t.langNav}">
    ${LOCALES.map((l) => l === locale
      ? html`<span class="lang__opt" aria-current="true" lang="${l}">${strings[l].meta.localeShort}<span class="sr-only"> ${strings[l].meta.localeName}</span></span>`
      : html`<a class="lang__opt" href="${cb.url[l]}" hreflang="${l}" lang="${l}" data-lang="${l}">${strings[l].meta.localeShort}<span class="sr-only"> ${strings[l].meta.localeName}</span></a>`)}
  </nav>`;
}

function hoursRows(cb: ClientBranch, locale: Locale): Raw {
  return html`${[1, 2, 3, 4, 5, 6, 7].map((wd) => {
    const h = cb.hours.find((x) => x.weekday === wd);
    return html`<tr data-weekday="${wd}"><th scope="row">${weekdayName(wd, locale)}</th><td>${h ? html`<bdi>${h.opens}–${displayTime(h.closes)}</bdi>` : strings[locale].menu.closedNoHours}</td></tr>`;
  })}`;
}

function renderItem(p: Product, cat: Category, i: number, cb: ClientBranch, locale: Locale, a: MenuAssets, sizes: MenuState["sizes"], eager: boolean): Raw {
  const t = strings[locale].menu;
  const name = pick(p.name_i18n, locale);
  const state = cb.a[i], flag = cb.f[i];
  const cls = ["item", state === "s" && "is-sold", flag === "c" && "is-campaign", (flag === "c" || flag === "x") && "is-diff", p.branch_id && "is-only"].filter(Boolean).join(" ");
  const allergens = p.allergens.map((code) => t.allergenNames[code]);
  return html`<li${attrs({ class: cls, "data-i": i, hidden: state === "h" })}>
    <div class="item__media">${p.image_key ? picture(p.image_key, name, a, THUMB_SIZES, eager) : html`<span class="item__ph">${categoryIcon(cat.icon, "", 30)}</span>`}</div>
    <div class="item__body">
      <h3 class="item__name"><button class="item__open" type="button" data-open aria-haspopup="dialog"><bdi>${name}</bdi></button></h3>
      <p class="item__badges">${p.tags.includes("new") ? html`<span class="badge badge--new">${t.new}</span>` : ""}<span class="badge badge--campaign">${t.campaign}</span><span class="badge badge--sold">${t.soldOut}</span>${p.branch_id ? html`<span class="badge badge--only">${t.branchOnly}</span>` : ""}</p>
      <p class="item__desc">${pick(p.description_i18n, locale)}</p>
      <ul class="sizes" role="list" aria-label="${t.sizePrices}">
        ${p.variants.map((v, vi) => {
          const k = sizes[v.size].s;
          const price = cb.p[i][vi] ?? 0, regular = cb.r[i][vi] ?? price, central = cb.cp[i][vi] ?? price;
          return html`<li class="size" data-v="${vi}">${k ? html`<span class="size__k">${k}</span>` : ""}<span class="size__p" data-p><bdi>${formatPrice(price, cb.currency, locale)}</bdi></span><s class="size__was" data-was${raw(regular === price ? " hidden" : "")}><span class="sr-only">${t.was}: </span><bdi>${formatPrice(regular, cb.currency, locale)}</bdi></s><span class="size__c" data-c${raw(central === price ? " hidden" : "")}><bdi>${fill(t.diffCentral, { p: formatPrice(central, cb.currency, locale) })}</bdi></span></li>`;
        })}
      </ul>
      ${allergens.length ? html`<p class="item__al" title="${t.allergens}: ${allergens.join(", ")}"><span class="sr-only">${t.allergens}: ${allergens.join(", ")}</span>${p.allergens.map((code) => allergenIcon(code))}</p>` : ""}
    </div>
  </li>`;
}

export function renderMenuPage(m: MenuModel, current: BranchMenu, locale: Locale, a: MenuAssets, sizes: MenuState["sizes"]): string {
  const catById = new Map(m.categories.map((c) => [c.id, c]));
  const categoryOf = (p: Product) => catById.get(p.category_id)!;
  const t = strings[locale].menu, c = strings[locale].common, meta = strings[locale].meta;
  const clients = m.branches.map((bm) => clientBranch(bm, locale));
  const cb = clients.find((x) => x.slug === current.bundle.branch.slug)!;
  const b = current.bundle.branch;

  const state: MenuState = {
    locale,
    page: b.slug,
    t: clientStrings(locale),
    sizes,
    allergens: t.allergenNames,
    products: m.cards.map((p) => ({
      n: pick(p.name_i18n, locale),
      d: pick(p.description_i18n, locale),
      c: categoryOf(p).icon,
      img: p.image_key ? (({ avif, webp, src }) => ({ avif, webp, src }))(a.images.get(p.image_key)!) : null,
      v: p.variants.map((v) => v.size),
      t: p.tags,
      al: p.allergens,
    })),
    branches: clients,
  };

  // Kategori bölümleri: kart indeksleri tüm şubelerde aynı
  let eagerLeft = 3; // ilk ekrandaki görseller tembel yüklenmez (LCP adayı)
  const catCards = m.categories.map((cat) => m.cards.map((p, i) => ({ p, i })).filter(({ p }) => p.category_id === cat.id));
  const catHidden = catCards.map((cards) => cards.every(({ i }) => cb.a[i] === "h"));
  const sections = m.categories.map((cat, ci) => html`<section class="cat" id="${cat.slug}" aria-labelledby="h-${cat.slug}" data-cat${raw(catHidden[ci] ? " hidden" : "")}>
      <h2 class="cat__title" id="h-${cat.slug}">${categoryIcon(cat.icon, "cat__icon", 22)}<span>${cat.name_i18n[locale]}</span></h2>
      <ul class="items" role="list">
        ${catCards[ci].map(({ p, i }) => {
          const eager = !!p.image_key && cb.a[i] !== "h" && eagerLeft-- > 0;
          return renderItem(p, cat, i, cb, locale, a, sizes, eager);
        })}
      </ul>
    </section>`);
  const hidden = hiddenCount(cb);

  const branchList = html`<ul class="blist" role="list">
    ${clients.map((x) => html`<li><a class="blist__link" href="${x.url[locale]}" data-slug="${x.slug}"${raw(x.slug === cb.slug ? ' aria-current="page"' : "")}>
      <span class="blist__dot blist__dot--${x.brand}" aria-hidden="true"></span>
      <span class="blist__text">
        <span class="blist__name"><bdi>${x.name}</bdi> <span class="blist__brand">${x.brandName}</span></span>
        <span class="blist__meta">${x.city} · <bdi>${x.currency}</bdi></span>
        <span class="blist__status" data-status-for="${x.slug}"></span>
      </span>
      <span class="blist__check">${icons.check()}</span>
    </a></li>`)}
  </ul>`;

  const body = html`
<a class="skip" href="#menu">${t.skip}</a>
<header class="mh">
  <div class="mh__top wrap">
    <a class="mh__brand" href="${cb.url[locale]}">${brandMarks(a)}</a>
    ${langNav(cb, locale)}
  </div>
  <div class="mh__branch wrap">
    <p class="mh__eyebrow"><span data-b="brandName">${cb.brandName}</span> · ${t.qrMenu}</p>
    <h1 class="mh__title"><bdi data-b="name">${cb.name}</bdi></h1>
    <p class="mh__city" data-b="city">${cb.city}</p>
    <div class="mh__row">
      <p class="status is-pending" data-open-status>${raw("&#8203;")}</p>
      <a class="bsel" href="${paths.menuIndex()}" data-branch-open aria-haspopup="dialog">${icons.pin()}<span>${t.branchChange}</span></a>
    </div>
  </div>
</header>

<div class="demo-strip">
  <div class="demo-strip__in wrap">
    <p class="demo-strip__note"><span class="demo-tag">${c.demo}</span> <span>${t.sample}</span></p>
    <button class="diff-toggle" type="button" role="switch" aria-checked="false" aria-describedby="diff-hint" data-diff-toggle>
      <span class="switch" aria-hidden="true"><span></span></span><span>${t.diffToggle}</span>
    </button>
    <p class="sr-only" id="diff-hint">${t.diffHint}</p>
  </div>
</div>

<nav class="cats" aria-label="${t.categoriesNav}" data-cats>
  <ul class="cats__list" role="list">
    ${m.categories.map((cat, i) => html`<li${raw(catHidden[i] ? " hidden" : "")}><a class="cats__link" href="#${cat.slug}" data-cat-link${raw(i === 0 ? ' aria-current="true"' : "")}>${cat.name_i18n[locale]}</a></li>`)}
  </ul>
</nav>

<main id="menu" class="menu wrap" tabindex="-1">
  <p class="diff-summary" data-diff-summary hidden></p>
  ${sections}
  <p class="menu__hidden" data-hidden-note${raw(hidden > 0 ? "" : " hidden")}>${fill(t.hiddenHere, { n: hidden })}</p>
  <p class="menu__note">${t.allergenNote}</p>
</main>

<section class="binfo wrap" aria-labelledby="h-binfo">
  <h2 class="binfo__title" id="h-binfo"><span data-b="brandName">${cb.brandName}</span> <bdi data-b="name">${cb.name}</bdi></h2>
  <div class="binfo__grid">
    <div class="binfo__block">
      <h3>${icons.clock()}${t.hoursTitle}</h3>
      <table class="hours"><tbody data-b="hours">${hoursRows(cb, locale)}</tbody></table>
    </div>
    <div class="binfo__block">
      <h3>${icons.pin()}${t.address}</h3>
      <p data-b="address">${cb.address}</p>
      <p><a class="link" href="${cb.maps}" data-b="maps" target="_blank" rel="noopener">${t.directions}${icons.external()}</a></p>
    </div>
    <div class="binfo__block">
      <h3>${icons.tag()}${t.currencyLabel} <bdi data-b="currency">${cb.currency}</bdi></h3>
      <p data-b="tier">${cb.tier}</p>
      <p class="note">${t.branchesNote}</p>
    </div>
  </div>
</section>

<aside class="managed wrap" aria-labelledby="h-managed">
  <span class="managed__glyph">${omqrGlyph(34)}</span>
  <div>
    <h2 class="managed__title" id="h-managed">${brandText(t.managedTitle)}</h2>
    <p>${brandText(t.managedBody)}</p>
    <p><a class="link" href="${paths.brief("#panel")}">${t.managedLink}${icons.arrow()}</a></p>
  </div>
</aside>

<footer class="mf wrap">
  <p>${c.rights}</p>
  <p class="mf__ca">${c.coffeeArtNote}</p>
  <p class="mf__meta">${fill(t.version, { v: a.version })} · ${brandText(c.madeWith)}</p>
</footer>

${backPill(c.backToBrief)}

<dialog class="sheet" id="branches" aria-labelledby="h-branches">
  <div class="sheet__head">
    <h2 id="h-branches">${t.branchesTitle}</h2>
    <button class="icon-btn" type="button" data-close aria-label="${c.close}">${icons.close()}</button>
  </div>
  <p class="sheet__lead">${t.branchesLead}</p>
  ${branchList}
  <p class="note">${t.branchesNote}</p>
</dialog>

<dialog class="sheet sheet--product" id="product" aria-labelledby="pd-name">
  <button class="icon-btn sheet__x" type="button" data-close aria-label="${c.close}">${icons.close()}</button>
  <div class="pd__media" data-pd-media></div>
  <div class="pd__body">
    <p class="item__badges pd__badges" data-pd-badges></p>
    <h2 class="pd__name" id="pd-name" data-pd-name></h2>
    <p class="pd__desc" data-pd-desc></p>
    <fieldset class="pd__sizes" data-pd-sizes-wrap>
      <legend>${t.sizes}</legend>
      <div class="seg" data-pd-sizes></div>
    </fieldset>
    <p class="pd__price"><span data-pd-price></span> <s data-pd-was></s></p>
    <div class="pd__al">
      <h3>${t.allergens}</h3>
      <ul class="pd__al-list" role="list" data-pd-al></ul>
      <p class="note">${t.allergenNote}</p>
    </div>
  </div>
</dialog>

<p class="sr-only" aria-live="polite" data-live></p>
${jsonScript("state", state)}`;

  const alternates = Object.fromEntries(LOCALES.map((l) => [l, cb.url[l]])) as Record<Locale, string>;
  return renderDocument({
    locale,
    dir: meta.dir as "ltr" | "rtl",
    title: cb.title,
    description: fill(t.description, { brand: cb.brandName, branch: cb.name }),
    selfUrl: cb.url[locale],
    alternates: { ...alternates, "x-default": cb.url[b.default_locale] },
    ogLocale: meta.ogLocale,
    og: { image: a.og.url, width: a.og.width, height: a.og.height, alt: fill(t.title, { brand: cb.brandName, branch: cb.name }), siteName: "Coffee House · QR Menü — Demo" },
    themeColor: b.brand === "coffee-art" ? "#462619" : "#FFFFFF",
    css: a.css,
    scripts: [a.js],
    preloads: a.fonts[locale],
    bodyAttrs: { "data-brand": b.brand, class: "page-menu" },
  }, body);
}

/** /menu/ — şube seçici (TR; demonun gezinme sayfası, misafir görmez: misafir şubenin karekodunu okutur). */
export function renderMenuSelector(m: MenuModel, a: MenuAssets): string {
  const locale: Locale = "tr";
  const t = strings.tr.menu, c = strings.tr.common, meta = strings.tr.meta;
  const clients = m.branches.map((bm) => clientBranch(bm, locale));
  const body = html`
<a class="skip" href="#secici">${c.skip}</a>
<header class="sel-head wrap">
  <img class="sel-head__logo" src="${a.logo}" alt="Coffee House" width="72" height="72">
  <div>
    <p class="mh__eyebrow"><span class="demo-tag">${c.demo}</span> Coffee House · Coffee Art</p>
    <h1 class="sel-head__title">${t.selectorTitle}</h1>
    <p class="sel-head__lead">${t.selectorLead}</p>
  </div>
</header>
<main id="secici" class="sel wrap">
  <ul class="sel__list" role="list">
    ${m.branches.map((bm, i) => {
      const x = clients[i], br = bm.bundle.branch;
      return html`<li class="scard" data-brand="${x.brand}">
        <div class="scard__qr">${raw(a.qr.get(x.slug)!)}<span>${t.selectorScan}</span></div>
        <div class="scard__body">
          <p class="scard__brand"><span class="blist__dot blist__dot--${x.brand}" aria-hidden="true"></span>${x.brandName}</p>
          <h2 class="scard__name">${pick(br.name_i18n, locale)}</h2>
          <p class="scard__city">${pick(br.city_i18n, locale)}</p>
          <dl class="scard__meta">
            <div><dt>${t.selectorLang}</dt><dd>${strings[br.default_locale].meta.localeName}</dd></div>
            <div><dt>${t.selectorCurrency}</dt><dd>${br.currency}</dd></div>
          </dl>
          <a class="btn btn--solid" href="${paths.menu(br.slug, br.default_locale, br.default_locale)}">${t.selectorOpen}${icons.arrow()}</a>
        </div>
      </li>`;
    })}
  </ul>
  <p class="sel__how">${t.selectorHow}</p>
</main>
<footer class="mf wrap">
  <p>${c.rights}</p>
  <p>${c.coffeeArtNote}</p>
</footer>
${backPill(c.backToBrief)}`;
  return renderDocument({
    locale,
    dir: "ltr",
    title: `Coffee House · ${t.selectorTitle}`,
    description: t.selectorLead,
    selfUrl: paths.menuIndex(),
    ogLocale: meta.ogLocale,
    og: { image: a.og.url, width: a.og.width, height: a.og.height, alt: `Coffee House · ${t.selectorTitle}`, siteName: "Coffee House · QR Menü — Demo" },
    themeColor: "#FFFFFF",
    css: a.css,
    scripts: [],
    preloads: a.fonts.tr,
    bodyAttrs: { "data-brand": "coffee-house", class: "page-menu page-selector" },
  }, body);
}
