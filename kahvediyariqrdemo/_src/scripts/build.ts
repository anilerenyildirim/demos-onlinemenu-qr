/**
 * Statik üretim: her rota hazır HTML olarak yazılır (Cloudflare Pages'te build yok, doğrudan URL/yenileme 404 vermez).
 *
 *   kahvediyariqrdemo/index.html                 → /kahvediyariqrdemo/
 *   kahvediyariqrdemo/en/index.html              → /kahvediyariqrdemo/en/
 *   kahvediyariqrdemo/sube/<slug>.html           → /kahvediyariqrdemo/sube/<slug>
 *   kahvediyariqrdemo/en/sube/<slug>.html        → /kahvediyariqrdemo/en/sube/<slug>
 *   kahvediyariqrdemo/assets/…                   → font, görsel, JS
 *
 * Çalıştırma: npm run build   (kaynak: _src/, referans: _ref/ — ikisine de dokunulmaz)
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import opentype from "opentype.js";
import sharp from "sharp";

import { BASE, paths } from "../src/config";
import { branches } from "../src/data/branches";
import { categories } from "../src/data/central/categories";
import { products } from "../src/data/central/products";
import { tenant } from "../src/data/central/tenant";
import { resolveMenu } from "../src/data/resolve";
import { LOCALES } from "../src/data/schema";
import { renderEntry } from "../src/render/entry";
import type { Assets } from "../src/render/layout";
import { renderMenu, type CompareRow } from "../src/render/menu";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(SRC, "..");
const ASSETS = path.join(OUT, "assets");
const nm = (p: string) => path.join(SRC, "node_modules", p);
const hash = (buf: Buffer | string) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const log = (msg: string) => console.log(`  ${msg}`);
/** Hero'da çizilen gerçek genişlik: mobilde bant yüksekliği × en-boy oranı (~735 px), geniş ekranda 100vw. */
const HERO_SIZES = "(max-width: 48rem) 740px, 100vw";

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
for (const p of ["index.html", "en", "sube", "assets"]) await rm(path.join(OUT, p), { recursive: true, force: true });
console.log("Kahve Diyarı demo build");

// ─── 1. Fontlar ─────────────────────────────────────────────────────────────
const fonts: [string, string][] = [
  ["@fontsource-variable/quicksand/files/quicksand-latin-wght-normal.woff2", "quicksand-latin.woff2"],
  ["@fontsource-variable/quicksand/files/quicksand-latin-ext-wght-normal.woff2", "quicksand-latin-ext.woff2"],
  ["@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2", "figtree-latin.woff2"],
  ["@fontsource-variable/figtree/files/figtree-latin-ext-wght-normal.woff2", "figtree-latin-ext.woff2"],
];
await mkdir(path.join(ASSETS, "fonts"), { recursive: true });
for (const [from, to] of fonts) await copyFile(nm(from), path.join(ASSETS, "fonts", to));
log(`fontlar: ${fonts.length} woff2`);

// ─── 2. Logo ve ikonlar ─────────────────────────────────────────────────────
const logoMark = (await readFile(path.join(SRC, "src/assets/logo-mark.svg"), "utf8")).trim();
const logoApp = await readFile(path.join(SRC, "src/assets/logo-app.svg"));
await write(path.join(ASSETS, "icon.svg"), logoApp);
await write(path.join(ASSETS, "icon-32.png"), await sharp(logoApp).resize(32, 32).png({ compressionLevel: 9 }).toBuffer());
await write(path.join(ASSETS, "apple-touch-icon.png"), await sharp(logoApp).resize(180, 180).png({ compressionLevel: 9 }).toBuffer());
log(`logo: inline SVG ${kb(logoMark.length)}, favicon + apple-touch-icon`);

// ─── 3. İç mekân fotoğrafı: AVIF + WebP ─────────────────────────────────────
// Kaynak: genişletilmiş kadraj (1584×672). Palet ölçümleri özgün _ref/ic-mekan.webp üzerinden yapıldı.
// Mobilde hero dikey olduğu için görsel "cover" ile ekran genişliğinin ~3 katı çizilir → büyük sürümler gerekli.
const photo = sharp(path.join(OUT, "_ref/ic-mekan-genis.jpg"));
const { width: pw = 0, height: ph = 0 } = await photo.metadata();
const widths = [800, 1200, pw];
const srcset: Record<"avif" | "webp", string[]> = { avif: [], webp: [] };
for (const w of widths) {
  const img = photo.clone().resize({ width: w });
  const avif = await img.clone().avif({ quality: 55, effort: 6 }).toBuffer();
  const webp = await img.clone().webp({ quality: 72, effort: 6 }).toBuffer();
  await write(path.join(ASSETS, `ic-mekan-${w}.avif`), avif);
  await write(path.join(ASSETS, `ic-mekan-${w}.webp`), webp);
  srcset.avif.push(`${paths.asset(`ic-mekan-${w}.avif`)} ${w}w`);
  srcset.webp.push(`${paths.asset(`ic-mekan-${w}.webp`)} ${w}w`);
  log(`ic-mekan ${w}px: avif ${kb(avif.length)}, webp ${kb(webp.length)}`);
}

// ─── 4. Açık Graph görseli (1200×630, logo + başlık) ────────────────────────
async function textPath(text: string, size: number, x: number, y: number, weight: 600 | 700, fill: string) {
  // Latin + latin-ext ayrı dosyalarda: her karakter için glifi içeren fontu seç.
  const load = async (sub: string) =>
    opentype.parse((await readFile(nm(`@fontsource/quicksand/files/quicksand-${sub}-${weight}-normal.woff`))).buffer as ArrayBuffer);
  const faces = [await load("latin"), await load("latin-ext")];
  let d = "", cx = x;
  for (const ch of text) {
    const font = faces.find((f) => f.charToGlyphIndex(ch) > 0) ?? faces[0];
    const glyph = font.charToGlyph(ch);
    d += glyph.getPath(cx, y, size).toPathData(1);
    cx += (glyph.advanceWidth ?? 0) * (size / font.unitsPerEm);
  }
  return `<path fill="${fill}" d="${d}"/>`;
}
{
  const W = 1200, H = 630;
  const markInner = logoMark.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace("currentColor", "#fff");
  const vb = logoMark.match(/viewBox="([^"]+)"/)![1].split(" ").map(Number);
  const markH = 330, markW = (vb[2] / vb[3]) * markH;
  const fluted = Array.from({ length: Math.ceil(W / 12) }, (_, i) =>
    `<rect x="${i * 12 + 7}" y="0" width="2" height="${H}" fill="#000" opacity=".2"/><rect x="${i * 12}" y="0" width="1.5" height="${H}" fill="#fff" opacity=".05"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><radialGradient id="spot" cx=".2" cy="0" r=".6"><stop offset="0" stop-color="#FFD6A0" stop-opacity=".22"/><stop offset="1" stop-color="#FFD6A0" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="#102A2E"/>${fluted}<rect width="${W}" height="${H}" fill="url(#spot)"/>
    <rect x="72" y="100" width="430" height="430" rx="56" fill="#06514D"/>
    <svg x="${72 + (430 - markW) / 2}" y="${100 + (430 - markH) / 2}" width="${markW}" height="${markH}" viewBox="${vb.join(" ")}">${markInner}</svg>
    ${await textPath("Kahve Diyarı", 92, 560, 290, 700, "#EAF6F7")}
    ${await textPath("Franchise QR menü demosu", 42, 564, 362, 600, "#7FD1C0")}
    <rect x="564" y="428" width="300" height="52" rx="26" fill="#151B20"/>
    <circle cx="592" cy="454" r="7" fill="#7FD1C0"/>
    ${await textPath("onlinemenu-qr.com", 26, 612, 463, 700, "#FFFFFF")}
  </svg>`;
  const og = await sharp(Buffer.from(svg)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  await write(path.join(OUT, "og.jpg"), og);
  log(`og.jpg: ${kb(og.length)}`);
}

// ─── 5. CSS + JS ────────────────────────────────────────────────────────────
const css = (
  await esbuild.transform((await readFile(path.join(SRC, "src/styles/app.css"), "utf8")).replaceAll("__BASE__", BASE), {
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
  logoMark,
  fontPreloads: [paths.asset("fonts/quicksand-latin.woff2"), paths.asset("fonts/figtree-latin.woff2")],
  hero: {
    avif: srcset.avif.join(", "),
    webp: srcset.webp.join(", "),
    fallback: paths.asset(`ic-mekan-1200.webp`),
    sizes: HERO_SIZES,
    width: pw, height: ph,
  },
  og: { url: `${BASE}/og.jpg`, width: 1200, height: 630 },
};

// ─── 6. Menüler: merkez + override → her şube ───────────────────────────────
const menus = new Map(branches.map((b) => [b.branch.slug, resolveMenu(tenant, categories, products, b)]));

// Karşılaştırma tablosu: aynı ürünün şubeler arası farkı (demo verisinde bilerek farklı)
const COMPARE: [string, string][] = [
  ["prd_latte", "prd_latte__m"],
  ["prd_flat_white", "prd_flat_white__tek"],
  ["prd_filtre", "prd_filtre__m"],
  ["prd_cold_brew", "prd_cold_brew__m"],
  ["prd_sahlep", "prd_sahlep__tek"],
  ["prd_cheesecake", "prd_cheesecake__tek"],
];
const compare: CompareRow[] = COMPARE.map(([product_id, variant_id]) => ({
  product_id, variant_id,
  cells: branches.map(({ branch }) => {
    const item = menus.get(branch.slug)!.flatMap((c) => c.items).find((i) => i.product.id === product_id);
    const variant = item?.variants.find((v) => v.id === variant_id);
    if (!item || !variant) throw new Error(`karşılaştırma: ${branch.slug} içinde ${variant_id} yok`);
    const short = (s: string) => s.split("·").pop()!.trim();
    return {
      slug: branch.slug,
      short_i18n: { tr: short(branch.name_i18n.tr), en: short(branch.name_i18n.en) },
      state: item.availability === "available" ? "price" : item.availability,
      price_minor: variant.price_minor,
    };
  }),
}));

// ─── 7. Sayfalar ────────────────────────────────────────────────────────────
const written: string[] = [];
for (const locale of LOCALES) {
  const entryUrl = paths.entry(locale);
  await write(fileFor(entryUrl), renderEntry(locale, branches, assets));
  written.push(entryUrl);

  for (const bundle of branches) {
    const url = paths.branch(locale, bundle.branch.slug);
    await write(fileFor(url), renderMenu(locale, bundle, menus.get(bundle.branch.slug)!, compare, assets));
    written.push(url);
  }

  // /sube/ klasörünün kendisi açılırsa şube seçimine yönlendir (kök "Demolar" sayfasına düşmesin)
  const subeIndex = entryUrl + "sube/";
  await write(
    fileFor(subeIndex),
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">` +
      `<meta http-equiv="refresh" content="0; url=${entryUrl}"><title>Kahve Diyarı</title><a href="${entryUrl}">${entryUrl}</a></html>\n`,
  );
  written.push(subeIndex);
}

log(`${written.length} sayfa:`);
for (const u of written) log(`  ${u}`);
console.log("tamam");
