import { BASE, SITE, paths } from "../config";
import type { Locale } from "../data/schema";
import { strings } from "../i18n";
import { html, raw, type Raw } from "./html";

/** Build'in sayfalara verdiği işlenmiş varlıklar. */
export interface Assets {
  css: string;
  js: string;
  logoMark: string; // inline SVG
  fontPreloads: string[];
  hero: { avif: string; webp: string; fallback: string; sizes: string; width: number; height: number };
  og: { url: string; width: number; height: number };
}

export interface PageMeta {
  locale: Locale;
  title: string;
  description: string;
  /** Bu sayfanın iki dildeki yolu — dil geçişi ve hreflang için. */
  alternates: Record<Locale, string>;
  page: "entry" | "menu";
}

export const logo = (a: Assets, cls = "mark") =>
  raw(a.logoMark.replace("<svg ", `<svg class="${cls}" aria-hidden="true" focusable="false" `));

export function langSwitch(meta: PageMeta): Raw {
  const t = strings[meta.locale];
  return html`<nav class="lang" aria-label="${t.langNav}">
    ${(["tr", "en"] as const).map((l) =>
      l === meta.locale
        ? html`<span class="lang__opt" aria-current="true">${t.localeShort[l]}</span>`
        : // Erişilebilir ad görünen kısaltmayı içermeli (WCAG 2.5.3): "TR Türkçe"
          html`<a class="lang__opt" href="${meta.alternates[l]}" hreflang="${l}" lang="${l}">${t.localeShort[l]}<span class="sr-only"> ${strings[l === "tr" ? "en" : "tr"].otherLocaleLabel}</span></a>`,
    )}
  </nav>`;
}

export function demoBadge(locale: Locale): Raw {
  const t = strings[locale];
  return html`<a class="demo-badge" href="https://onlinemenu-qr.com" rel="noopener" title="${t.demoBadgeTitle}">
    <span class="demo-badge__dot" aria-hidden="true"></span>${t.demoBadge}<span class="demo-badge__sep" aria-hidden="true">·</span>onlinemenu-qr.com
  </a>`;
}

export function document(meta: PageMeta, a: Assets, body: Raw): string {
  const t = strings[meta.locale];
  const url = SITE + meta.alternates[meta.locale];
  return `<!doctype html>${html`<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<meta name="theme-color" content="#102A2E">
<meta name="color-scheme" content="light">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kahve Diyarı · QR Menü Demo">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${meta.locale === "tr" ? "tr_TR" : "en_GB"}">
<meta property="og:image" content="${SITE + a.og.url}">
<meta property="og:image:width" content="${a.og.width}">
<meta property="og:image:height" content="${a.og.height}">
<meta property="og:image:alt" content="Kahve Diyarı logosu">
<meta name="twitter:card" content="summary_large_image">
${(["tr", "en"] as const).map((l) => html`<link rel="alternate" hreflang="${l}" href="${SITE + meta.alternates[l]}">\n`)}
<link rel="icon" href="${paths.asset("icon.svg")}" type="image/svg+xml">
<link rel="icon" href="${paths.asset("icon-32.png")}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${paths.asset("apple-touch-icon.png")}">
${a.fontPreloads.map((f) => html`<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>\n`)}
${meta.page === "entry" ? html`<link rel="preload" as="image" type="image/avif" imagesrcset="${a.hero.avif}" imagesizes="${a.hero.sizes}" fetchpriority="high">` : ""}
<style>${raw(a.css)}</style>
<script type="module" src="${a.js}"></script>
</head>
<body data-page="${meta.page}" data-base="${BASE}">
${body}
</body>
</html>`.value}\n`;
}
