import { paths } from "../config";
import { SERVICE_LABEL } from "../data/central/service";
import type { BranchBundle, Locale } from "../data/schema";
import { strings } from "../i18n";
import { normalize } from "../shared/normalize";
import { html, raw } from "./html";
import { ui } from "./icons";
import { demoBadge, document, langSwitch, logo, type Assets, type PageMeta } from "./layout";

export function renderEntry(locale: Locale, bundles: BranchBundle[], a: Assets): string {
  const t = strings[locale];
  const meta: PageMeta = {
    locale,
    page: "entry",
    title: t.entryTitle,
    description: t.entryDescription,
    alternates: { tr: paths.entry("tr"), en: paths.entry("en") },
  };

  const body = html`
<a class="skip" href="#subeler">${t.entryHeading}</a>
<header class="hero">
  <picture class="hero__photo">
    <source type="image/avif" srcset="${a.hero.avif}" sizes="${a.hero.sizes}">
    <source type="image/webp" srcset="${a.hero.webp}" sizes="${a.hero.sizes}">
    <img src="${a.hero.fallback}" width="${a.hero.width}" height="${a.hero.height}" alt="${t.heroAlt}" fetchpriority="high" decoding="async">
  </picture>
  <div class="hero__top">
    <span class="hero__mark">${logo(a)}</span>
    <div class="hero__tools">${demoBadge(locale)}${langSwitch(meta)}</div>
  </div>
  <div class="hero__brand">
    <p class="wordmark">Kahve Diyarı</p>
    <p class="bubble bubble--light">${t.entryBubble}</p>
  </div>
</header>

<main class="entry" id="subeler" tabindex="-1">
  <h1 class="entry__title">${t.entryHeading}</h1>
  <p class="entry__lead">${t.entryLead}</p>

  <p class="continue" data-continue hidden>
    <a class="continue__link" href="#" data-continue-link>
      <span class="continue__label">${t.continueLast}</span>
      <span class="continue__name" data-continue-name></span>
      ${ui.chevron()}
    </a>
  </p>

  <div class="field">
    <label class="field__label" for="sube-ara">${t.branchSearchLabel}</label>
    <div class="field__control">
      ${ui.search()}
      <input id="sube-ara" type="search" autocomplete="off" enterkeyhint="search" placeholder="${t.branchSearchPlaceholder}" data-branch-search>
    </div>
  </div>

  <ul class="branches" data-branch-list>
    ${bundles.map(({ branch: b }) => html`
    <li data-search="${normalize(`${b.name_i18n.tr} ${b.name_i18n.en} ${b.kind_i18n[locale]} ${SERVICE_LABEL[b.service_mode][locale]}`)}">
      <a class="branch" href="${paths.branch(locale, b.slug)}" data-slug="${b.slug}" data-name="${b.name_i18n[locale]}">
        <span class="branch__eyebrow">${t.sampleNotice}</span>
        <span class="branch__name">${b.name_i18n[locale]}</span>
        <span class="branch__kind">${b.kind_i18n[locale]} · ${SERVICE_LABEL[b.service_mode][locale]}</span>
        <span class="open-status" data-open-status data-hours="${JSON.stringify(b.hours)}" data-tz="${b.timezone}"></span>
        <span class="branch__qr"><span class="branch__qr-label">${t.qrTarget}</span> <code>${paths.branch(locale, b.slug)}</code></span>
        <span class="branch__go">${ui.chevron()}</span>
      </a>
    </li>`)}
  </ul>
  <p class="empty" data-branch-empty role="status" hidden>${t.branchNone}</p>
</main>

<footer class="foot foot--entry">
  <p>${t.footerDemo}</p>
</footer>
${jsonScript("i18n", clientStrings(locale))}`;

  return document(meta, a, body);
}

/** İstemcinin ihtiyaç duyduğu metinler (fonksiyonlar JSON'a geçmez; şablon olarak taşınır). */
export function clientStrings(locale: Locale) {
  const t = strings[locale];
  return {
    locale,
    openNow: t.openNow("{t}"),
    closedNow: t.closedNow("{t}"),
    closedNoHours: t.closedNoHours,
    tomorrow: t.tomorrow,
    today: t.today,
    weekdays: t.weekdays,
    searchCount: t.searchCount(999).replace("999", "{n}"),
    searchCountOne: t.searchCount(1),
    searchNone: t.searchNone("{q}"),
  };
}

/** <script type="application/json"> içeriği ham metindir: entity kaçışı yerine "<" JSON içinde kaçışlanır. */
export const jsonScript = (id: string, data: unknown) =>
  raw(`<script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);
