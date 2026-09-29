/**
 * Tüm sayfaların ortak <head>'i: CSP, noindex, OG/Twitter, hreflang, ikonlar, preload, satır içi CSS, modül JS.
 * Sunum, menü ve site aynı iskeleti kullanır; yalnızca içerik ve varlık listesi değişir.
 */
import { BASE, SITE, type Locale } from "../config";
import { html, raw, type Raw } from "./html";

export interface Preload {
  href?: string;
  as: "font" | "image" | "fetch" | "video";
  type?: string;
  imagesrcset?: string;
  imagesizes?: string;
  fetchpriority?: "high" | "low";
  media?: string;
}

export interface DocMeta {
  locale: Locale;
  dir: "ltr" | "rtl";
  title: string;
  description: string;
  /** BASE ile başlayan yol */
  selfUrl: string;
  /** hreflang alternatifleri (yol) — x-default dahil */
  alternates?: Partial<Record<Locale | "x-default", string>>;
  ogLocale: string;
  og: { image: string; width: number; height: number; alt: string; siteName: string };
  themeColor: string;
  css: string;
  scripts: string[];
  preloads: Preload[];
  bodyAttrs?: Record<string, string>;
  jsonLd?: object[];
  /** Sayfaya özel ek CSP kaynakları gerekmez; tüm varlıklar self-host. */
}

/**
 * Ortak _headers politikasına EK olarak sayfa düzeyinde daraltma — iki politika birlikte uygulanır.
 * Satır içi <script> yok (JSON veri blokları çalıştırılmaz, CSP'ye tabi değil). frame-ancestors _headers'ta.
 */
const CSP = "default-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

export function renderDocument(meta: DocMeta, body: Raw): string {
  const abs = (p: string) => SITE + p;
  const alt = meta.alternates ?? {};
  const ld = (meta.jsonLd ?? []).map((o) => raw(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>\n`));
  const preload = (p: Preload) => raw(`<link rel="preload" as="${p.as}"${p.href ? ` href="${p.href}"` : ""}${p.type ? ` type="${p.type}"` : ""}${p.as === "font" || p.as === "fetch" ? " crossorigin" : ""}${p.imagesrcset ? ` imagesrcset="${p.imagesrcset}"` : ""}${p.imagesizes ? ` imagesizes="${p.imagesizes}"` : ""}${p.fetchpriority ? ` fetchpriority="${p.fetchpriority}"` : ""}${p.media ? ` media="${p.media}"` : ""}>\n`);
  const bodyAttrs = Object.entries(meta.bodyAttrs ?? {}).map(([k, v]) => ` ${k}="${v}"`).join("");

  return `<!doctype html>${html`<html lang="${meta.locale}" dir="${meta.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="robots" content="noindex, nofollow">
<title>${meta.title}</title>
<meta name="description" content="${meta.description}">
<meta name="theme-color" content="${meta.themeColor}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${meta.og.siteName}">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description}">
<meta property="og:url" content="${abs(meta.selfUrl)}">
<meta property="og:locale" content="${meta.ogLocale}">
<meta property="og:image" content="${abs(meta.og.image)}">
<meta property="og:image:width" content="${meta.og.width}">
<meta property="og:image:height" content="${meta.og.height}">
<meta property="og:image:alt" content="${meta.og.alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${meta.title}">
<meta name="twitter:description" content="${meta.description}">
<meta name="twitter:image" content="${abs(meta.og.image)}">
<link rel="canonical" href="${abs(meta.selfUrl)}">
${Object.entries(alt).map(([l, p]) => html`<link rel="alternate" hreflang="${l}" href="${abs(p!)}">\n`)}
<link rel="icon" href="${BASE}/assets/favicon.ico" sizes="32x32">
<link rel="icon" href="${BASE}/assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${BASE}/assets/apple-touch-icon.png">
${meta.preloads.map(preload)}
<style>${raw(meta.css)}</style>
${meta.scripts.map((s) => html`<script type="module" src="${s}"></script>\n`)}
${ld}
</head>
<body${raw(bodyAttrs)}>
${body}
</body>
</html>`.value}\n`;
}

/** Sayfaya gömülen istemci durumu — JSON veri bloğu (çalıştırılmaz). */
export const jsonScript = (id: string, data: unknown): Raw =>
  raw(`<script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);
