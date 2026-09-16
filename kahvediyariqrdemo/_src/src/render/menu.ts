import { paths } from "../config";
import { SERVICE_LABEL } from "../data/central/service";
import type { BranchBundle, Locale } from "../data/schema";
import type { ResolvedCategory, ResolvedProduct } from "../data/resolve";
import { displayTime } from "../shared/hours";
import { formatPrice, strings } from "../i18n";
import { normalize } from "../shared/normalize";
import { attrs, html, type Raw } from "./html";
import { categoryIcon, ui } from "./icons";
import { clientStrings, jsonScript } from "./entry";
import { demoBadge, document, langSwitch, logo, type Assets, type PageMeta } from "./layout";

/** Karşılaştırma tablosu satırı: her şube için hücre değeri (build'de tüm şubeler çözülerek hazırlanır). */
export interface CompareRow {
  product_id: string;
  variant_id: string;
  cells: { slug: string; short_i18n: Record<Locale, string>; state: "price" | "sold_out" | "hidden"; price_minor: number }[];
}

export function renderMenu(
  locale: Locale,
  bundle: BranchBundle,
  menu: ResolvedCategory[],
  compare: CompareRow[],
  a: Assets,
): string {
  const t = strings[locale];
  const b = bundle.branch;
  const name = b.name_i18n[locale];
  const meta: PageMeta = {
    locale,
    page: "menu",
    title: t.menuTitle(name),
    description: t.menuDescription(name),
    alternates: { tr: paths.branch("tr", b.slug), en: paths.branch("en", b.slug) },
  };

  const all = menu.flatMap((c) => c.items);
  const summary = {
    price: all.filter((i) => i.price_differs).length,
    soldOut: all.filter((i) => i.availability === "sold_out").length,
    hidden: all.filter((i) => i.availability === "hidden").length,
    only: all.filter((i) => i.branch_only).length,
  };
  const productName = (id: string) => all.find((i) => i.product.id === id)!.product.name_i18n[locale];
  const variantLabel = (pid: string, vid: string) =>
    all.find((i) => i.product.id === pid)!.variants.find((v) => v.id === vid)!.label_i18n?.[locale];

  const body = html`
<a class="skip" href="#menu">${t.skipToMenu}</a>
<header class="counter">
  <div class="counter__bar">
    <a class="brand" href="${paths.entry(locale)}">
      ${logo(a)}<span class="brand__name">Kahve Diyarı</span>
    </a>
    ${langSwitch(meta)}
  </div>
  <div class="counter__branch">
    <p class="eyebrow eyebrow--mint">${t.sampleNotice}</p>
    <h1 class="counter__title">${name}</h1>
    <p class="counter__meta">
      <span class="open-status open-status--dark" data-open-status data-hours="${JSON.stringify(b.hours)}" data-tz="${b.timezone}"></span>
      <a class="counter__change" href="${paths.entry(locale)}">${ui.swap()}${t.changeBranch}</a>
    </p>
  </div>
  <p class="bubble bubble--sign">${SERVICE_LABEL[b.service_mode][locale]}</p>
</header>

<div class="demo-strip">
  ${demoBadge(locale)}
  <button class="fx-toggle" type="button" role="switch" aria-checked="false" aria-describedby="fx-hint" data-fx-toggle>
    <span class="fx-toggle__track" aria-hidden="true"><span class="fx-toggle__thumb"></span></span>
    <span class="fx-toggle__label">${t.fxToggle}</span>
  </button>
  <p class="sr-only" id="fx-hint">${t.fxToggleHint}</p>
</div>
<p class="fx-summary" data-fx-summary hidden>${t.fxSummary(summary)}</p>

<nav class="catbar" aria-label="${t.categoriesNav}" data-catbar>
  <div class="search">
    <label class="sr-only" for="menu-ara">${t.searchLabel}</label>
    ${ui.search()}
    <input id="menu-ara" type="search" autocomplete="off" enterkeyhint="search" placeholder="${t.searchPlaceholder}" data-menu-search>
    <button class="search__clear" type="button" data-search-clear hidden>${ui.close()}<span class="sr-only">${t.searchClear}</span></button>
  </div>
  <ul class="chips" data-chips>
    ${menu.map(({ category: c, items }) => html`
    <li${attrs({ "data-chip": c.slug, "data-fx-only": items.every((i) => i.availability === "hidden") })}><a class="chip" href="#${c.slug}">${c.name_i18n[locale]}</a></li>`)}
  </ul>
</nav>

<main id="menu" class="menu" tabindex="-1">
  <p class="sr-only" role="status" aria-live="polite" data-search-status></p>
  <p class="empty" data-search-empty hidden></p>

  ${menu.map(({ category: c, items }) => html`
  <section class="cat" id="${c.slug}" aria-labelledby="h-${c.slug}" data-cat${attrs({ "data-fx-only": items.every((i) => i.availability === "hidden") })}>
    <div class="cat__head">
      <h2 class="cat__title" id="h-${c.slug}">${c.name_i18n[locale]}</h2>
      ${c.description_i18n ? html`<p class="cat__desc">${c.description_i18n[locale]}</p>` : ""}
    </div>
    <ul class="items" role="list">
      ${items.map((item) => renderItem(item, c.icon, locale, b.price_adjust_pct))}
    </ul>
  </section>`)}

  <p class="menu__notes"><strong>${t.pricesNote}</strong> ${t.allergenNote}</p>
</main>

<section class="info" aria-labelledby="h-info">
  <h2 class="section-title" id="h-info">${t.branchInfoHeading}</h2>
  <div class="info__grid">
    <div class="panel panel--steps">
      <h3 class="panel__title">${t.howToOrder}</h3>
      <ol class="steps">
        ${b.order_steps_i18n.map((s) => html`<li class="bubble bubble--step">${s[locale]}</li>`)}
      </ol>
    </div>
    <div class="panel">
      <h3 class="panel__title">${ui.clock()}${t.hoursHeading}</h3>
      <table class="hours">
        <tbody>
          ${t.weekdays.map((day, i) => {
            const h = b.hours.find((x) => x.weekday === i + 1);
            return html`<tr data-weekday="${i + 1}"><th scope="row">${day}</th><td>${h ? `${h.opens}–${displayTime(h.closes)}` : t.closedDay}</td></tr>`;
          })}
        </tbody>
      </table>
    </div>
    <div class="panel">
      <h3 class="panel__title">${ui.pin()}${t.addressHeading}</h3>
      <p class="panel__text">${b.address_i18n[locale]}</p>
      <h3 class="panel__title">${ui.phone()}${t.phoneHeading}</h3>
      <p class="panel__text">${b.phone}</p>
    </div>
  </div>
</section>

<section class="offer" aria-labelledby="h-offer">
  <p class="eyebrow">onlinemenu-qr.com</p>
  <h2 class="section-title section-title--light" id="h-offer">${t.offerHeading}</h2>
  <p class="offer__lead">${t.offerLead}</p>
  <ul class="offer__list" role="list">
    ${t.offerItems.map(([title, text]) => html`<li><h3>${title}</h3><p>${text}</p></li>`)}
  </ul>

  <figure class="compare">
    <figcaption><span class="compare__title">${t.compareHeading}</span> <span class="compare__caption">${t.compareCaption}</span></figcaption>
    <div class="compare__scroll" tabindex="0" role="region" aria-label="${t.compareHeading}">
      <table>
        <thead>
          <tr>
            <th scope="col">${t.compareProduct}</th>
            ${compare[0].cells.map((cell) => html`<th scope="col"${attrs({ class: cell.slug === b.slug ? "is-here" : null })}>${cell.short_i18n[locale]}${cell.slug === b.slug ? html`<span class="sr-only"> (${t.thisBranch})</span>` : ""}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${compare.map((row) => {
            const size = variantLabel(row.product_id, row.variant_id);
            return html`<tr>
            <th scope="row">${productName(row.product_id)}${size ? html` <span class="compare__size">${size}</span>` : ""}</th>
            ${row.cells.map((cell) => html`<td class="${cell.slug === b.slug ? "is-here " : ""}is-${cell.state}">${
              cell.state === "price" ? formatPrice(cell.price_minor, locale) : cell.state === "sold_out" ? t.soldOut : t.compareHidden
            }</td>`)}
          </tr>`;
          })}
        </tbody>
      </table>
    </div>
  </figure>
</section>

<footer class="foot">
  <p><strong>${t.pricesNote}</strong> ${t.footerDemo}</p>
  <p><a href="${paths.entry(locale)}">${t.footerBack}</a></p>
</footer>
${jsonScript("i18n", clientStrings(locale))}
${jsonScript("branch", { slug: b.slug, name: name })}`;

  return document(meta, a, body);
}

function renderItem(item: ResolvedProduct, icon: Parameters<typeof categoryIcon>[0], locale: Locale, pct: number): Raw {
  const t = strings[locale];
  const p = item.product;
  const soldOut = item.availability === "sold_out";
  const hidden = item.availability === "hidden";
  const searchText = normalize([
    p.name_i18n.tr, p.name_i18n.en, p.description_i18n[locale],
    ...p.tags.map((tag) => t.tags[tag]), ...p.allergens.map((al) => t.allergens[al]),
  ].join(" "));

  const sourceText = (s: ResolvedProduct["variants"][number]["source"]) =>
    s === "branch_pct" ? t.fxSource.branch_pct(pct) : s === "central" ? "" : t.fxSource[s];

  return html`
      <li${attrs({
        class: `item${soldOut ? " is-sold-out" : ""}${hidden ? " is-hidden-here" : ""}${item.branch_only ? " is-branch-only" : ""}${item.price_differs ? " is-price-diff" : ""}`,
        "data-item": true,
        "data-search": searchText,
      })}>
        <div class="item__img" aria-hidden="true">${categoryIcon(icon)}</div>
        <div class="item__body">
          <div class="item__head">
            <h3 class="item__name">${p.name_i18n[locale]}</h3>
            ${p.tags.length ? html`<ul class="tags" role="list">${p.tags.map((tag) => html`<li class="tag tag--${tag}">${t.tags[tag]}</li>`)}</ul>` : ""}
          </div>
          ${hidden ? html`<p class="flag flag--hidden fx">${t.fxHiddenHere}</p>` : ""}
          ${item.branch_only ? html`<p class="flag flag--only fx">${t.fxBranchOnly}</p>` : ""}
          <p class="item__desc">${p.description_i18n[locale]}</p>
          <ul class="prices" role="list">
            ${item.variants.map((v) => html`
            <li class="price">
              ${v.label_i18n ? html`<span class="price__size">${v.label_i18n[locale]}</span>` : ""}
              <span class="price__value">${formatPrice(v.price_minor, locale)}</span>
            </li>`)}
          </ul>
          ${item.price_differs
            ? html`<p class="price-note fx">${t.fxCentral(item.variants.map((v) => formatPrice(v.central_price_minor, locale)).join(" / "))}<span class="price-note__why"> · ${sourceText(item.variants.find((v) => v.source !== "central")!.source)}</span></p>`
            : ""}
          ${soldOut ? html`<p class="flag flag--sold-out">${t.soldOutHint}</p>` : ""}
          ${p.allergens.length
            ? html`<p class="allergens"><span class="allergens__label">${t.allergensLabel}:</span> ${p.allergens.map((al) => t.allergens[al]).join(", ")}</p>`
            : ""}
        </div>
      </li>`;
}
