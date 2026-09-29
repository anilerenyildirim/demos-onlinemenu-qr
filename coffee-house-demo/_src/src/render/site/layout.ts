/**
 * Kurumsal site iskeleti: demo notu, başlık (logo + gezinme + dil + başvuru), footer, sabit WhatsApp ve
 * "← Sunuma dön". AR/RU'da çevrilmeyen sayfalar gezinmede EN sürümüne bağlanır ve "EN" ile işaretlenir.
 */
import { LOCALES, hasPage, paths, type Locale, type SitePage } from "../../config";
import { company } from "../../data/network";
import { strings, type Strings } from "../../i18n";
import { phoneIntl, telHref } from "../../shared/format";
import { renderDocument, type Preload } from "../document";
import { attrs, brandText, html, raw, type Raw } from "../html";
import { icons } from "../icons";
import { backPill } from "../menu";
import type { Responsive } from "../types";

export interface SiteAssets {
  css: string;
  /** Harita sayfalarına eklenen Leaflet CSS'i (yalnızca şubeler ve iletişim) */
  mapCss: string;
  js: string;
  /** Harita modülü (Leaflet dahil) — yalnızca harita görünür olunca dinamik yüklenir */
  mapJs: string;
  logo: string;
  fonts: Record<Locale, Preload[]>;
  og: Record<Locale, { url: string; width: number; height: number }>;
  img: Record<string, Responsive>;
  alt: (file: string, l: Locale) => string;
  video: { mp4: string; webm: string; poster: Responsive };
  mapPreview: { url: string; width: number; height: number };
  geo: { region: string; marmara: string };
}

export type SiteT = Strings["site"];
export const siteT = (l: Locale): SiteT => strings[l].site;

export const NAV: SitePage[] = ["franchising", "branches", "brands", "references", "about", "contact"];

export const waHref = (l: Locale) => `https://wa.me/${company.whatsapp_e164.replace(/\D/g, "")}?text=${encodeURIComponent(siteT(l).wa.text)}`;
export const mailHref = () => `mailto:${company.eposta}`;
export const instaHandle = () => "@" + company.instagram.replace(/\/$/, "").split("/").pop();

export const pic = (r: Responsive, alt: string, sizes: string, opts: { cls?: string; eager?: boolean; high?: boolean } = {}): Raw => html`<picture${attrs({ class: opts.cls ?? null })}>
  <source type="image/avif" srcset="${r.avif}" sizes="${sizes}">
  <source type="image/webp" srcset="${r.webp}" sizes="${sizes}">
  <img src="${r.src}" alt="${alt}" width="${r.w}" height="${r.h}"${raw(opts.eager ? "" : ' loading="lazy"')}${raw(opts.high ? ' fetchpriority="high"' : "")} decoding="async">
</picture>`;

/** Sayfa başlığı (h1 + öncül) — iç sayfalar */
export const pageHead = (h1: string, lead: string, extra: Raw | "" = ""): Raw => html`<header class="phead">
  <div class="wrap">
    <h1 class="phead__title">${h1}</h1>
    <p class="phead__lead">${lead}</p>
    ${extra}
  </div>
</header>`;

function navLink(page: SitePage, l: Locale, current: SitePage): Raw {
  const t = siteT(l).nav;
  const fallback = !hasPage(page, l);
  return html`<li><a class="nav__link" href="${paths.site(page, l)}"${raw(page === current ? ' aria-current="page"' : "")}${fallback ? attrs({ hreflang: "en", title: t.enOnlyTitle }) : ""}>${t[page as keyof typeof t] as string}${fallback ? html`<span class="nav__en" aria-hidden="true">${t.enOnly}</span><span class="sr-only"> (${t.enOnlyTitle})</span>` : ""}</a></li>`;
}

function langSwitch(page: SitePage, l: Locale): Raw {
  const t = siteT(l).nav;
  return html`<nav class="lang" aria-label="${t.langLabel}">
    ${LOCALES.map((x) => {
      const exists = hasPage(page, x);
      const label = html`${strings[x].meta.localeShort}<span class="sr-only"> ${strings[x].meta.localeName}${exists ? "" : ` — ${siteT(x).nav.langHome}`}</span>`;
      return x === l
        ? html`<span class="lang__opt" aria-current="true" lang="${x}">${label}</span>`
        : html`<a class="lang__opt${exists ? "" : " lang__opt--home"}" href="${exists ? paths.site(page, x) : paths.site("home", x)}" hreflang="${x}" lang="${x}"${exists ? "" : attrs({ title: siteT(x).nav.langPartial })}>${label}</a>`;
    })}
  </nav>`;
}

export interface SitePageInput {
  page: SitePage;
  locale: Locale;
  title: string;
  description: string;
  body: Raw;
  jsonLd?: object[];
  map?: boolean;
  preloads?: Preload[];
  a: SiteAssets;
}

export function renderSitePage(p: SitePageInput): string {
  const { page, locale: l, a } = p;
  const t = siteT(l), c = strings[l].common, meta = strings[l].meta;
  const available = LOCALES.filter((x) => hasPage(page, x));
  const alternates: Partial<Record<Locale | "x-default", string>> = Object.fromEntries(available.map((x) => [x, paths.site(page, x)]));
  alternates["x-default"] = paths.site(page, "tr");

  const body = html`
<a class="skip" href="#icerik">${c.skip}</a>
<p class="demo-note"><span class="demo-tag">${c.demo}</span> ${t.meta.demoStrip}</p>
<header class="sh">
  <div class="sh__bar wrap">
    <a class="sh__logo" href="${paths.site("home", l)}"><img src="${a.logo}" alt="Coffee House" width="56" height="56"></a>
    <nav class="nav" aria-label="${t.nav.label}">
      <ul class="nav__list" role="list">${NAV.map((x) => navLink(x, l, page))}</ul>
    </nav>
    <div class="sh__tools">
      ${langSwitch(page, l)}
      <a class="btn btn--solid sh__apply" href="${paths.site("franchising", l)}#basvuru">${t.nav.apply}</a>
    </div>
  </div>
</header>
<main id="icerik" tabindex="-1">
${p.body}
</main>
<footer class="sf">
  <div class="wrap sf__grid">
    <div class="sf__brand">
      <img src="${a.logo}" alt="Coffee House" width="72" height="72" loading="lazy">
      <p>${t.footer.tagline}</p>
      <p><a class="sf__link" href="${company.instagram}" rel="noopener" target="_blank">${t.footer.instagram} ${instaHandle()}</a></p>
    </div>
    <div>
      <h2 class="sf__h">${t.footer.contactTitle}</h2>
      <address class="sf__addr">
        <span><b>${t.footer.address}</b> ${company.adres}</span>
        <span><b>${t.footer.phone}</b> <a href="${telHref(company.telefon)}"><bdi>${phoneIntl(company.telefon)}</bdi></a></span>
        <span><b>${t.footer.whatsapp}</b> <a href="${waHref(l)}" rel="noopener" target="_blank"><bdi>${phoneIntl(company.telefon)}</bdi></a></span>
        <span><b>${t.footer.email}</b> <a href="${mailHref()}">${company.eposta}</a></span>
      </address>
    </div>
    <div>
      <h2 class="sf__h">${t.footer.pagesTitle}</h2>
      <ul class="sf__list" role="list">${(["home", ...NAV] as SitePage[]).map((x) => navLink(x, l, page))}</ul>
    </div>
    <div>
      <h2 class="sf__h">${t.footer.legalTitle}</h2>
      <ul class="sf__list" role="list">${(["privacy", "cookies"] as SitePage[]).map((x) => html`<li><a class="nav__link" href="${paths.site(x, l)}"${raw(x === page ? ' aria-current="page"' : "")}>${x === "privacy" ? t.footer.privacy : t.footer.cookies}${hasPage(x, l) ? "" : html`<span class="nav__en" aria-hidden="true">EN</span>`}</a></li>`)}</ul>
    </div>
  </div>
  <div class="wrap sf__bottom">
    <p>${t.footer.rights}</p>
    <p>${c.rights}</p>
    ${l === "ar" || l === "ru" ? html`<p>${t.nav.langPartial}</p>` : ""}
    <p>${brandText(c.madeWith)}</p>
  </div>
</footer>
<a class="wa-fab" href="${waHref(l)}" rel="noopener" target="_blank" aria-label="${t.wa.label}">${icons.whatsapp()}<span class="wa-fab__label">${t.wa.label}</span></a>
${backPill(c.backToBrief)}`;

  return renderDocument({
    locale: l,
    dir: meta.dir as "ltr" | "rtl",
    title: p.title,
    description: p.description,
    selfUrl: paths.site(page, l),
    alternates,
    ogLocale: meta.ogLocale,
    og: { image: a.og[l].url, width: a.og[l].width, height: a.og[l].height, alt: t.meta.ogAlt, siteName: "Coffee House" },
    themeColor: "#FFFFFF",
    // Leaflet CSS'i önce: sitenin kendi harita biçimleri (deniz rengi, popup) onu ezebilsin
    css: p.map ? a.mapCss + a.css : a.css,
    scripts: [a.js],
    preloads: [...(p.preloads ?? []), ...a.fonts[l]],
    bodyAttrs: { class: `page-site page-site--${page}` },
    jsonLd: p.jsonLd,
  }, body);
}
