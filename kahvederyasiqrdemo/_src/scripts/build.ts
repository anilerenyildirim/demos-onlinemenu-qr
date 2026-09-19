/**
 * Statik üretim: her rota hazır HTML olarak yazılır (Cloudflare Pages'te build yok; doğrudan URL/yenileme 404 vermez).
 *
 *   kahvederyasiqrdemo/index.html                → /kahvederyasiqrdemo/                (TR, varsayılan şube)
 *   kahvederyasiqrdemo/sube/<slug>.html          → /kahvederyasiqrdemo/sube/<slug>
 *   kahvederyasiqrdemo/{en,ar}/index.html        → /kahvederyasiqrdemo/{en,ar}/
 *   kahvederyasiqrdemo/{en,ar}/sube/<slug>.html  → /kahvederyasiqrdemo/{en,ar}/sube/<slug>
 *   kahvederyasiqrdemo/assets/…                  → font, logo, hero, ikon, JS
 *   kahvederyasiqrdemo/og.jpg                    → Açık Graph önizlemesi
 *
 * Ürün görselleri (kahvederyasiqrdemo/urunler/) scripts/scrape-assets.ts'in çıktısıdır; build onlara dokunmaz.
 * Çalıştırma: npm run build   (kaynak: _src/, referans: _ref/ — ikisine de yazılmaz)
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync } from "node:zlib";
import * as esbuild from "esbuild";
import opentype from "opentype.js";
import sharp from "sharp";
import subsetFont from "subset-font";

import { BASE, paths } from "../src/config";
import { branches } from "../src/data/branches";
import { domesticBranchCount } from "../src/data/branches/real";
import { categories } from "../src/data/central/categories";
import { productId, products } from "../src/data/central/products";
import { tenant } from "../src/data/central/tenant";
import { resolveMenu } from "../src/data/resolve";
import { LOCALES, pick, type BranchBundle, type Locale } from "../src/data/schema";
import { renderPage, type Assets, type CompareRow, type Measurement } from "../src/render/page";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(SRC, "..");
const REF = path.join(OUT, "_ref");
const ASSETS = path.join(OUT, "assets");
const nm = (p: string) => path.join(SRC, "node_modules", p);
const hash = (buf: Buffer | string) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const log = (msg: string) => console.log(`  ${msg}`);

/** URL yolu → çıktı dosyası. "/x/" → x/index.html, "/x/y" → x/y.html */
function fileFor(urlPath: string): string {
  if (!urlPath.startsWith(BASE + "/")) throw new Error(`BASE dışı yol: ${urlPath}`);
  const rel = urlPath.slice(BASE.length + 1);
  return path.join(OUT, rel === "" || rel.endsWith("/") ? `${rel}index.html` : `${rel}.html`);
}

async function write(file: string, data: string | Buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

// ─── 0. Temizlik: yalnızca üretilen yollar ──────────────────────────────────
for (const p of ["index.html", "sube", "en", "ar", "assets", "og.jpg"]) await rm(path.join(OUT, p), { recursive: true, force: true });
console.log("Kahve Deryası demo build");

// ─── 1. Fontlar (kendi barındırma; CDN yok) ─────────────────────────────────
// Manrope Variable: Latin arayüz metni (Türkçe ğ ş ı İ latin-ext'te) — swap + ölçü eşlemeli yedek.
// IBM Plex Sans Arabic: yalnızca Arapça glifler — optional (Arapça sistem fontlarının ölçüleri çok farklı, swap kaydırır).
// TEYİT: font seçimi marka onayı bekliyor.
const FONT_FILES = {
  "manrope-latin.woff2": { from: "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2", css: "@fontsource-variable/manrope/wght.css", family: "Manrope", weight: "200 800", display: "swap", subset: false },
  "manrope-latin-ext.woff2": { from: "@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2", css: "@fontsource-variable/manrope/wght.css", family: "Manrope", weight: "200 800", display: "swap", subset: false },
  "plex-arabic-400.woff2": { from: "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2", css: "@fontsource/ibm-plex-sans-arabic/400.css", family: "IBM Plex Sans Arabic", weight: "400", display: "optional", subset: true },
  "plex-arabic-600.woff2": { from: "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2", css: "@fontsource/ibm-plex-sans-arabic/600.css", family: "IBM Plex Sans Arabic", weight: "600 800", display: "optional", subset: true },
} as const;

/**
 * Arapça alt kümesi: temel Arapça blok (tüm harfler + harekeler + noktalama + Arapça rakamlar) ve yön işaretleri.
 * İçerik değişse de her Arapça harf kapsanır; harfbuzz bağlamsal biçimleri (GSUB) korur. ~86 KB → ~33 KB.
 * OFL: lisansta Reserved Font Name yok → alt kümeleme serbest.
 */
const ARABIC_RANGES: [number, number][] = [[0x0600, 0x0605], [0x060C, 0x060C], [0x061B, 0x061F], [0x0621, 0x065F], [0x0660, 0x066D], [0x0670, 0x0670], [0x200C, 0x200F]];
const arabicText = ARABIC_RANGES.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i))).join("");
const hex = (n: number) => n.toString(16).toUpperCase();
const arabicRange = ARABIC_RANGES.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(",");

await mkdir(path.join(ASSETS, "fonts"), { recursive: true });
let fontCss = "";
for (const [name, f] of Object.entries(FONT_FILES)) {
  let range: string | undefined;
  if (f.subset) {
    await write(path.join(ASSETS, "fonts", name), await subsetFont(await readFile(nm(f.from)), arabicText, { targetFormat: "woff2" }));
    range = arabicRange;
  } else {
    await copyFile(nm(f.from), path.join(ASSETS, "fonts", name));
    // unicode-range paketin kendi CSS'inden okunur (elle yazılmaz)
    const pkgCss = await readFile(nm(f.css), "utf8");
    const block = pkgCss.split("@font-face").find((b) => b.includes(path.basename(f.from)));
    range = block?.match(/unicode-range:\s*([^;]+);/)?.[1];
  }
  if (!range) throw new Error(`unicode-range bulunamadı: ${f.from}`);
  fontCss += `@font-face{font-family:"${f.family}";font-style:normal;font-display:${f.display};font-weight:${f.weight};src:url(${paths.asset(`fonts/${name}`)}) format("woff2");unicode-range:${range}}`;
}
// Font gelene kadar ölçüsü eşlenmiş yedek (Arial) — yazı tipi değişiminde kayma olmasın
{
  const manrope = opentype.parse((await readFile(nm("@fontsource/manrope/files/manrope-latin-400-normal.woff"))).buffer as ArrayBuffer);
  const upm = manrope.unitsPerEm;
  const os2 = manrope.tables.os2 as unknown as { xAvgCharWidth: number };
  const hhea = manrope.tables.hhea as unknown as { ascender: number; descender: number; lineGap: number };
  const arialAvg = 904 / 2048; // Arial OS/2 xAvgCharWidth / unitsPerEm
  const sizeAdjust = os2.xAvgCharWidth / upm / arialAvg;
  const pct = (v: number) => `${((v / upm / sizeAdjust) * 100).toFixed(2)}%`;
  fontCss += `@font-face{font-family:"Manrope Fallback";src:local("Arial"),local("Helvetica Neue"),local("Roboto");size-adjust:${(sizeAdjust * 100).toFixed(2)}%;ascent-override:${pct(hhea.ascender)};descent-override:${pct(Math.abs(hhea.descender))};line-gap-override:${pct(hhea.lineGap)}}`;
}
const FONT_PRELOADS: Record<Locale, string[]> = {
  tr: [paths.asset("fonts/manrope-latin.woff2"), paths.asset("fonts/manrope-latin-ext.woff2")],
  en: [paths.asset("fonts/manrope-latin.woff2"), paths.asset("fonts/manrope-latin-ext.woff2")],
  // Arapça yüzler font-display: optional — geç gelirse o görüntülemede değiştirilmez (satır kırılımı kayması / CLS olmaz);
  // önden yüklendikleri için normal koşulda ilk boyamaya yetişir. Latin (şube/ürün adları) da önden: swap'ı kaydırıyordu.
  ar: [paths.asset("fonts/plex-arabic-400.woff2"), paths.asset("fonts/plex-arabic-600.woff2"), paths.asset("fonts/manrope-latin.woff2")],
};
log(`fontlar: ${Object.keys(FONT_FILES).length} woff2 (Arapça alt kümeli) + ölçü eşlemeli yedek`);

// ─── 2. Logo: resmi logo, wordmark beyaz ────────────────────────────────────
// Onaylı karar: koyu zeminde gri wordmark (#57585B, 2.74:1) okunmadığı için wordmark pikselleri beyaza çevrilir —
// markanın kendi tabelasındaki (hero) gibi. Form, oran, çözünürlük ve magenta chevron (#EB008B) DEĞİŞMEZ; alfa korunur.
const logoSrc = sharp(path.join(REF, "logo.png")).ensureAlpha();
const { data: logoPx, info: logoInfo } = await logoSrc.raw().toBuffer({ resolveWithObject: true });
const whitened = Buffer.from(logoPx);
let chevron = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
for (let i = 0; i < whitened.length; i += 4) {
  const [r, g, b, al] = [whitened[i], whitened[i + 1], whitened[i + 2], whitened[i + 3]];
  if (al === 0) continue;
  const isGray = Math.max(r, g, b) - Math.min(r, g, b) < 48;
  if (isGray) { whitened[i] = whitened[i + 1] = whitened[i + 2] = 255; }
  else if (al > 128) {
    const p = i / 4, x = p % logoInfo.width, y = Math.floor(p / logoInfo.width);
    chevron = { x0: Math.min(chevron.x0, x), y0: Math.min(chevron.y0, y), x1: Math.max(chevron.x1, x), y1: Math.max(chevron.y1, y) };
  }
}
const rawOpts = { raw: { width: logoInfo.width, height: logoInfo.height, channels: 4 as const } };
const logoWhitePng = await sharp(whitened, rawOpts).png({ compressionLevel: 9 }).toBuffer();
const logoWebp = await sharp(whitened, rawOpts).webp({ lossless: true, effort: 6 }).toBuffer();
const logoName = `logo-${hash(logoWebp)}.webp`;
await write(path.join(ASSETS, logoName), logoWebp);
log(`logo: ${logoInfo.width}×${logoInfo.height} webp lossless ${kb(logoWebp.length)} (2x → ${logoInfo.width / 2}px CSS)`);

// ─── 3. İkonlar: favicon = logodaki chevron, apple-touch = beyaz logo ────────
{
  const BG = { r: 14, g: 12, b: 15, alpha: 1 };
  const cw = chevron.x1 - chevron.x0 + 1, ch = chevron.y1 - chevron.y0 + 1;
  const chev = await sharp(logoPx, rawOpts).extract({ left: chevron.x0, top: chevron.y0, width: cw, height: ch }).png().toBuffer();
  const fav = await sharp({ create: { width: 32, height: 32, channels: 4, background: BG } })
    .composite([{ input: await sharp(chev).resize({ width: 26 }).toBuffer(), gravity: "center" }]).png({ compressionLevel: 9 }).toBuffer();
  await write(path.join(ASSETS, "icon-32.png"), fav);
  const touch = await sharp({ create: { width: 180, height: 180, channels: 4, background: BG } })
    .composite([{ input: await sharp(logoWhitePng).resize({ width: 148 }).toBuffer(), gravity: "center" }]).png({ compressionLevel: 9 }).toBuffer();
  await write(path.join(ASSETS, "apple-touch-icon.png"), touch);
  log(`ikonlar: favicon 32 (${kb(fav.length)}), apple-touch 180 (${kb(touch.length)})`);
}

// ─── 4. Hero: temsilî gece cephesi — AVIF + WebP, responsive ───────────────
// Mobilde 16:10 bant, geniş ekranda 62vh; iki durumda da görsel ekran genişliğinde çizilir → sizes=100vw.
const HERO_WIDTHS = [640, 828, 1280, 1672];
const heroSrc = sharp(path.join(REF, "hero.png"));
const { width: hw = 0, height: hh = 0 } = await heroSrc.metadata();
const heroSet: Record<"avif" | "webp", string[]> = { avif: [], webp: [] };
for (const w of HERO_WIDTHS) {
  const img = heroSrc.clone().resize({ width: w });
  const avif = await img.clone().avif({ quality: 50, effort: 6 }).toBuffer();
  const webp = await img.clone().webp({ quality: 72, effort: 6 }).toBuffer();
  await write(path.join(ASSETS, `hero-${w}.avif`), avif);
  await write(path.join(ASSETS, `hero-${w}.webp`), webp);
  heroSet.avif.push(`${paths.asset(`hero-${w}.avif`)} ${w}w`);
  heroSet.webp.push(`${paths.asset(`hero-${w}.webp`)} ${w}w`);
  log(`hero ${w}px: avif ${kb(avif.length)}, webp ${kb(webp.length)}`);
}

// ─── 5. Açık Graph görseli (1200×630): hero + logo + başlık + demo ibaresi ──
async function textPath(text: string, size: number, x: number, y: number, weight: 600 | 700 | 800, fill: string) {
  const load = async (sub: string) =>
    opentype.parse((await readFile(nm(`@fontsource/manrope/files/manrope-${sub}-${weight}-normal.woff`))).buffer as ArrayBuffer);
  const faces = [await load("latin"), await load("latin-ext")];
  // toPathData(1) bazı değerlerde tek koordinatı "NaN" yazıyor (librsvg path'i orada keser) → komutlardan kendimiz yazarız
  const n = (v: number) => String(Math.round(v * 10) / 10);
  let d = "", cx = x;
  for (const ch of text) {
    const font = faces.find((f) => f.charToGlyphIndex(ch) > 0) ?? faces[0];
    const glyph = font.charToGlyph(ch);
    for (const c of glyph.getPath(cx, y, size).commands) {
      if (c.type === "M" || c.type === "L") d += `${c.type}${n(c.x)} ${n(c.y)}`;
      else if (c.type === "Q") d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      else if (c.type === "C") d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      else d += "Z";
    }
    cx += (glyph.advanceWidth ?? 0) * (size / font.unitsPerEm);
  }
  return { svg: `<path fill="${fill}" d="${d}"/>`, width: cx - x };
}
{
  const W = 1200, H = 630;
  const bg = await heroSrc.clone().resize(W, H, { fit: "cover", position: "centre" }).toBuffer();
  const logoW = 357, logoH = Math.round((logoInfo.height / logoInfo.width) * logoW);
  const logoBig = await sharp(logoWhitePng).resize({ width: logoW, kernel: "lanczos3" }).png().toBuffer();
  const title = await textPath("Franchise QR Menü Demosu", 46, 64, 500, 800, "#F6F4F8");
  const pill = await textPath("DEMO — onlinemenu-qr.com", 24, 96, 567, 700, "#F6F4F8");
  const cap = await textPath("Temsilî görsel", 20, 44, 58, 600, "#F6F4F8");
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0E0C0F" stop-opacity=".25"/><stop offset=".38" stop-color="#0E0C0F" stop-opacity=".15"/>
      <stop offset=".72" stop-color="#0E0C0F" stop-opacity=".9"/><stop offset="1" stop-color="#0E0C0F" stop-opacity="1"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
    <rect x="28" y="30" width="${cap.width + 32}" height="40" rx="20" fill="#0A090B" fill-opacity=".88"/>${cap.svg}
    ${title.svg}
    <rect x="64" y="532" width="${pill.width + 60}" height="50" rx="25" fill="#0A090B" stroke="#F5239C" stroke-opacity=".7"/>
    <circle cx="80" cy="557" r="6" fill="#F5239C"/>${pill.svg}
  </svg>`;
  const og = await sharp(bg)
    .composite([{ input: Buffer.from(overlay) }, { input: logoBig, left: 64, top: 432 - logoH }])
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  await write(path.join(OUT, "og.jpg"), og);
  log(`og.jpg: ${kb(og.length)}`);
}

// ─── 6. CSS (satır içi) + JS ────────────────────────────────────────────────
const css = (
  await esbuild.transform((await readFile(path.join(SRC, "src/styles/app.css"), "utf8")).replace("/*__FONTS__*/", fontCss), {
    loader: "css", minify: true, target: ["chrome111", "safari16.4", "firefox113"],
  })
).code.trim();
log(`css (inline): ${kb(css.length)}`);

const js = await esbuild.build({
  entryPoints: [path.join(SRC, "src/client/app.ts")],
  bundle: true, minify: true, format: "esm", target: ["chrome111", "safari16.4", "firefox113"], write: false,
});
const jsBuf = Buffer.from(js.outputFiles[0].contents);
const jsName = `app-${hash(jsBuf)}.js`;
await write(path.join(ASSETS, jsName), jsBuf);
log(`js: ${jsName} ${kb(jsBuf.length)}`);

const assets: Assets = {
  css,
  js: paths.asset(jsName),
  logo: { src: paths.asset(logoName), width: logoInfo.width / 2, height: logoInfo.height / 2 },
  fonts: FONT_PRELOADS,
  hero: {
    avif: heroSet.avif.join(", "), webp: heroSet.webp.join(", "),
    fallback: paths.asset("hero-828.webp"), sizes: "100vw", width: hw, height: hh,
  },
  og: { url: `${BASE}/og.jpg`, width: 1200, height: 630 },
};

// ─── 7. Menüler: merkez + override → her şube ───────────────────────────────
const centralBundle: BranchBundle = { branch: { ...branches[0].branch, price_adjust_pct: 0 }, overrides: [], products: [] };
const central = resolveMenu(tenant, categories, products, centralBundle);
const menus = new Map(branches.map((b) => [b.branch.slug, resolveMenu(tenant, categories, products, b)]));
// Kart indeksleri tüm şubelerde aynı olmalı (istemci fiyat/stok tablosu buna dayanır)
const order = central.flatMap((c) => c.items.map((i) => i.product.id)).join();
for (const [slug, m] of menus) if (m.flatMap((c) => c.items.map((i) => i.product.id)).join() !== order) throw new Error(`${slug}: ürün sırası merkezle aynı değil`);

// Karşılaştırma tablosu: bilerek farklı bırakılan ürünler
const COMPARE = ["turk-kahvesi", "cafe-latte", "menengic-kahvesi", "cold-brew-sutlu", "syphon", "tiramisu"];
const compare: CompareRow[] = COMPARE.map((slug) => {
  const id = productId(slug);
  const c = central.flatMap((x) => x.items).find((i) => i.product.id === id);
  if (!c) throw new Error(`karşılaştırma: ${slug} yok`);
  return {
    product_id: id, name: pick(c.product.name_i18n, "tr"), central: c.variants[0].price_minor,
    cells: branches.map(({ branch }) => {
      const it = menus.get(branch.slug)!.flatMap((x) => x.items).find((i) => i.product.id === id)!;
      return { slug: branch.slug, price: it.variants[0].price_minor, availability: it.availability };
    }),
  };
});

const measurementFile = path.join(SRC, "data/olcum.json");
const measurement: Measurement | null = existsSync(measurementFile) ? JSON.parse(await readFile(measurementFile, "utf8")) : null;
log(measurement ? `teknik şerit: ${path.relative(OUT, measurementFile)} (${measurement.date})` : "teknik şerit: ölçüm yok → basılmadı");

// ─── 8. Sayfalar ────────────────────────────────────────────────────────────
const written: { url: string; bytes: number; br: number }[] = [];
async function page(url: string, source: string) {
  // Şablon girintisi: etiketler arası satır sonu + boşluk anlamsız → kaldır (satır içi boşluklara dokunulmaz)
  const htmlStr = source.replace(/>\s*\n\s*</g, "><");
  await write(fileFor(url), htmlStr);
  written.push({ url, bytes: Buffer.byteLength(htmlStr), br: brotliCompressSync(htmlStr).length });
}
for (const locale of LOCALES) {
  const common = { locale, branches, menus, central, compare, domesticCount: domesticBranchCount, measurement, assets };
  await page(paths.entry(locale), renderPage({ ...common, entry: true, current: branches[0] }));
  for (const b of branches) await page(paths.branch(locale, b.branch.slug), renderPage({ ...common, entry: false, current: b }));
  // /sube/ klasörünün kendisi açılırsa girişe yönlendir (kök "Demolar" sayfasına ya da 404'e düşmesin)
  const entryUrl = paths.entry(locale);
  await page(`${entryUrl}sube/`,
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">` +
    `<meta http-equiv="refresh" content="0; url=${entryUrl}"><title>Kahve Deryası</title><a href="${entryUrl}">${entryUrl}</a></html>\n`);
}

log(`${written.length} sayfa:`);
for (const w of written) log(`  ${w.url.padEnd(58)} ${kb(w.bytes).padStart(9)}  br ${kb(w.br)}`);
console.log("tamam");
