/**
 * Statik üretim — her rota hazır HTML (Cloudflare Pages'te build yok; doğrudan URL/yenileme 404 vermez).
 *
 *   coffee-house-demo/index.html                  → /coffee-house-demo/                 sunum (TR)
 *   coffee-house-demo/menu/index.html             → /coffee-house-demo/menu/            şube seçici (TR)
 *   coffee-house-demo/menu/<şube>/index.html      → /coffee-house-demo/menu/<şube>/     QR menü, şubenin varsayılan dili
 *   coffee-house-demo/menu/<şube>/<dil>.html      → /coffee-house-demo/menu/<şube>/<dil>
 *   coffee-house-demo/site/…                      → kurumsal site (TR, /en/, /ar/, /ru/)
 *   coffee-house-demo/assets/…                    → font, logo, ikon, görsel, JS
 *   coffee-house-demo/og*.jpg                     → Açık Graph önizlemeleri
 *
 * Dokunulmayanlar: ../video/ (npm run video), ../_ref/ (kaynak), _src/data (kaynak veri).
 * Çalıştırma: npm run build
 */
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import QRCode from "qrcode";

import { LOCALES, SITE, paths, type Locale } from "../src/config";
import { branches, categories, productImages, products, sizes, tenant } from "../src/data/load";
import { resolveMenu, type ResolvedCategory } from "../src/data/resolve";
import { pick, type SizeKey } from "../src/data/schema";
import { strings, validateStrings } from "../src/i18n";
import { renderBrief, type BriefData, type LighthouseResult } from "../src/render/brief";
import type { SiteAssets } from "../src/render/site/layout";
import { renderAbout, renderBrands, renderBranches, renderContact, renderFranchising, renderHome, renderLegal, renderReferences, type MenuLink } from "../src/render/site/pages";
import { BRAND_NAME, menuModel, renderMenuPage, renderMenuSelector, type MenuAssets, type ProductImage } from "../src/render/menu";
import type { Responsive } from "../src/render/types";
import { formatPrice } from "../src/shared/format";
import type { MenuState } from "../src/shared/state";
import { buildFonts } from "./lib/fonts";
import { buildLogoAndIcons, derive, square } from "./lib/images";
import { mapPreviewSvg } from "./lib/map-preview";
import { OG, ogBrief, ogMenu, ogSite } from "./lib/og";
import { ASSETS, OUT, SRC, hash, kb, log, page, write, written } from "./lib/out";

console.log("Coffee House demo build");
validateStrings();

// ─── 0. Temizlik: yalnızca üretilen yollar ──────────────────────────────────
for (const p of ["index.html", "menu", "site", "assets", "og.jpg", "og-menu.jpg", "og-site.jpg", "og-site-en.jpg"]) {
  await rm(path.join(OUT, p), { recursive: true, force: true });
}

// ─── 1. Fontlar, logo, ikonlar ──────────────────────────────────────────────
const fonts = await buildFonts();
const logo = await buildLogoAndIcons();

// ─── 2. Ürün görselleri (markanın fotoğraflarından kare kırpım) ─────────────
const productImg = new Map<string, ProductImage>();
for (const im of productImages) {
  const r = await derive(im.key, `galeri/${im.file}`, square(im.crop), [176, 352, 640]);
  productImg.set(im.key, { avif: r.avif, webp: r.webp, src: r.src, w: r.w });
}
log(`ürün görselleri: ${productImages.length} ürün × AVIF/WebP (176/352/640w, kırpım kenarından büyük üretilmez)`);

// ─── 3. CSS + JS ────────────────────────────────────────────────────────────
const TARGET = ["chrome111", "safari16.4", "firefox113"];
async function css(...files: string[]) {
  const src = (await Promise.all(files.map((f) => readFile(path.join(SRC, "src/styles", f), "utf8")))).join("\n").replace("/*__FONTS__*/", fonts.css);
  return (await esbuild.transform(src, { loader: "css", minify: true, target: TARGET })).code.trim();
}
async function js(entry: string, name: string) {
  const r = await esbuild.build({ entryPoints: [path.join(SRC, "src/client", entry)], bundle: true, minify: true, format: "esm", target: TARGET, write: false });
  const buf = Buffer.from(r.outputFiles[0].contents);
  const file = `${name}-${hash(buf)}.js`;
  await write(path.join(ASSETS, file), buf);
  log(`js: ${file} ${kb(buf.length)}`);
  return paths.asset(file);
}
const menuCss = await css("base.css", "menu.css");
log(`css (satır içi) menü: ${kb(menuCss.length)}`);
const menuJs = await js("menu.ts", "menu");

// ─── 4. Menüler: merkez + override → her şube ───────────────────────────────
const resolved = new Map<string, ResolvedCategory[]>(branches.map((b) => [b.branch.slug, resolveMenu(tenant, categories, products, b)]));
const model = menuModel(categories, products, branches, resolved);

const qr = new Map<string, string>();
for (const b of branches) {
  const url = SITE + paths.menu(b.branch.slug, b.branch.default_locale, b.branch.default_locale);
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#151515", light: "#FFFFFF" } });
  qr.set(b.branch.slug, svg.replace(/<\?xml[^>]*>/, "").replace("<svg ", `<svg role="img" aria-label="${url}" `).trim());
}

const menuShots = ["cappuccino", "cilekli-matcha", "karamel-frappe"].map((slug) => {
  const im = productImages.find((x) => x.key === `urun-${slug}`)!;
  return { source: `galeri/${im.file}`, crop: im.crop };
});
const menuAssets: MenuAssets = {
  css: menuCss, js: menuJs, logo: logo.url, fonts: fonts.preloads,
  og: { url: await ogMenu(logo.svg, menuShots, { branches: branches.length, locales: LOCALES.length, currencies: new Set(branches.map((b) => b.branch.currency)).size }), ...OG },
  images: productImg, qr, version: tenant.menu_version,
};

const sizesFor = (l: Locale): MenuState["sizes"] =>
  Object.fromEntries(Object.values(sizes).map((s) => [s.key, { s: s.short_i18n?.[l] ?? null, l: s.label_i18n?.[l] ?? null, ml: s.ml }])) as Record<SizeKey, { s: string | null; l: string | null; ml: number | null }>;

await page(paths.menuIndex(), renderMenuSelector(model, menuAssets));
for (const bm of model.branches) {
  for (const l of LOCALES) await page(paths.menu(bm.bundle.branch.slug, l, bm.bundle.branch.default_locale), renderMenuPage(model, bm, l, menuAssets, sizesFor(l)));
}
log(`menü: ${model.cards.length} kart (${products.length} merkez + ${model.cards.length - products.length} şubeye özel), ${branches.length} şube × ${LOCALES.length} dil, sürüm ${tenant.menu_version}`);

// ─── 5. Sunum (/coffee-house-demo/) ─────────────────────────────────────────
const gallery: { dosya: string; alt: Record<Locale, string> }[] = JSON.parse(await readFile(path.join(SRC, "data/gorseller.json"), "utf8")).gorseller;
const altOf = (file: string, l: Locale) => gallery.find((g) => g.dosya === file)!.alt[l];
const facade = await derive("magaza-cephesi", "galeri/magaza-cephesi-gece.jpg", { x: 0, y: 400, w: 1080, h: 1350 }, [480, 840]);
const poster = await derive("tanitim-kare", "hero-poster.jpg", null, [360, 720]);
const asSquare = (p: ProductImage): Responsive => ({ ...p, h: p.w });
const bubbles = ["urun-cappuccino", "urun-cilekli-matcha", "urun-karamel-frappe"].map((k) => asSquare(productImg.get(k)!));

// Logonun mavi halka katmanı → kapaktaki dev halka (logonun kendi geometrisi)
const ringD = logo.svg.match(/<path fill="#4A8CC8"[^>]* d="([^"]+)"/)?.[1];
const viewBox = logo.svg.match(/viewBox="([^"]+)"/)?.[1];
if (!ringD || !viewBox) throw new Error("logo halkası SVG'de bulunamadı");

const audit = existsSync(path.join(SRC, "audit/coffee-house-lighthouse.json")) ? JSON.parse(await readFile(path.join(SRC, "audit/coffee-house-lighthouse.json"), "utf8")) : { results: {} };
const lhCurrent: LighthouseResult | null = audit.results["mevcut"] ?? null;
const lhDemo: LighthouseResult | null = audit.results["demo-site"] ?? null;
log(`ölçüm: mevcut ${lhCurrent ? `perf ${lhCurrent.median.performance} (${lhCurrent.date})` : "yok"} · demo ${lhDemo ? `perf ${lhDemo.median.performance} (${lhDemo.date})` : "yok → karşılaştırma basılmadı"}`);

// Panel ekranları gerçek demo verisinden
const cappIndex = model.cards.findIndex((p) => p.slug === "cappuccino");
const priceRows = model.branches.map((bm) => {
  const b = bm.bundle.branch, item = bm.items[cappIndex]!;
  const pct = b.price_adjust_pct;
  return {
    branch: pick(b.name_i18n, "tr"), brand: BRAND_NAME[b.brand], currency: b.currency,
    tier: pct === 0 ? strings.tr.menu.tierCentral.replace(/\.$/, "") : `${pct > 0 ? "+" : "−"}%${Math.abs(pct)}`,
    prices: item.variants.map((v) => formatPrice(v.price_minor, b.currency, "tr")),
  };
});
const catalogRows = ["cappuccino", "iced-latte", "cilekli-matcha", "karak-chai", "salep"].map((slug) => {
  const i = model.cards.findIndex((p) => p.slug === slug);
  const p = model.cards[i];
  const live = model.branches.filter((bm) => bm.items[i] && bm.items[i]!.availability !== "hidden");
  return {
    name: pick(p.name_i18n, "tr"),
    category: pick(categories.find((c) => c.id === p.category_id)!.name_i18n, "tr"),
    branches: live.length === 1 ? `Yalnızca ${pick(live[0].bundle.branch.name_i18n, "tr")}` : `${live.length}/${model.branches.length} şube`,
    badge: p.tags.includes("new") ? strings.tr.menu.new : p.branch_id ? strings.tr.menu.branchOnly : null,
  };
});
const briefData: BriefData = {
  current: lhCurrent, demo: lhDemo, priceRows, catalogRows,
  priceSizes: ["S", "M", "L"],
  counts: { branches: model.branches.length, locales: LOCALES.length, currencies: new Set(model.branches.map((b) => b.bundle.branch.currency)).size },
};
const briefCss = await css("base.css", "brief.css");
log(`css (satır içi) sunum: ${kb(briefCss.length)}`);
await page(paths.brief(), renderBrief(briefData, {
  css: briefCss, js: await js("brief.ts", "brief"), logo: logo.url, ring: { viewBox, d: ringD },
  fonts: fonts.preloads.tr, og: { url: await ogBrief(logo.svg), ...OG },
  facade, facadeAlt: altOf("magaza-cephesi-gece.jpg", "tr"), bubbles, poster,
}));

// ─── 6. Kurumsal site (/coffee-house-demo/site/…) ───────────────────────────
// Galeri ve sayfa görselleri: 4:5 kırpım (kaynak 1080×1920) — y ofseti içeriğe göre seçildi
const SITE_IMG: [string, string, number][] = [
  ["ic-mekan", "ic-mekan-oturma-alani.jpg", 285], ["soguk-icecekler", "cilekli-matcha-iced-latte-yakin.jpg", 500],
  ["latte-art", "latte-art-kalpli.jpg", 570], ["pop-art", "ic-mekan-pop-art-duvar.jpg", 120],
  ["neon-logo", "neon-logo-kahvenin-evine-hosgeldiniz.jpg", 280], ["latte-neon", "latte-fincan-neon-tabela.jpg", 330],
  ["uc-fincan", "espresso-telve-cekirdek-uc-fincan.jpg", 285],
];
const siteImg: Record<string, Responsive> = {};
for (const [key, file, y] of SITE_IMG) siteImg[key] = await derive(key, `galeri/${file}`, { x: 0, y, w: 1080, h: 1350 }, [360, 540, 800]);
log(`site görselleri: ${SITE_IMG.length} × AVIF/WebP (360/540/800w, 4:5)`);

const preview = await mapPreviewSvg();
const previewName = `harita-onizleme-${hash(preview.svg)}.svg`;
await write(path.join(ASSETS, previewName), preview.svg);
const geoAsset = async (file: string) => {
  const buf = await readFile(path.join(SRC, "data/geo", file));
  const name = `geo/${file.replace(".json", "")}-${hash(buf)}.json`;
  await write(path.join(ASSETS, name), buf);
  return paths.asset(name);
};
const leafletCss = (await esbuild.transform(await readFile(path.join(SRC, "node_modules/leaflet/dist/leaflet.css"), "utf8"), { loader: "css", minify: true, target: TARGET })).code.trim();
const siteCss = await css("base.css", "site.css");
log(`css (satır içi) site: ${kb(siteCss.length)} · harita sayfalarına + Leaflet ${kb(leafletCss.length)}`);
const ogSiteTr = await ogSite("og-site.jpg", logo.svg, "hero-poster.jpg", ["GİRİŞ BEDELİ YOK.", "ROYALTY YOK.", "ANAHTAR TESLİM."], "Coffee House franchise · 3 ülke");
const ogSiteEn = await ogSite("og-site-en.jpg", logo.svg, "hero-poster.jpg", ["NO ENTRY FEE.", "NO ROYALTIES.", "TURNKEY."], "Coffee House franchise · 3 countries");
const ogOf = (url: string) => ({ url, ...OG });
const siteAssets: SiteAssets = {
  css: siteCss, mapCss: leafletCss,
  js: await js("site.ts", "site"), mapJs: await js("map.ts", "harita"),
  logo: logo.url, fonts: fonts.preloads,
  og: { tr: ogOf(ogSiteTr), en: ogOf(ogSiteEn), ar: ogOf(ogSiteEn), ru: ogOf(ogSiteEn) },
  img: siteImg, alt: altOf,
  video: { mp4: paths.video("hero-720.mp4"), webm: paths.video("hero-720.webm"), poster },
  mapPreview: { url: paths.asset(previewName), width: preview.width, height: preview.height },
  geo: { region: await geoAsset("bolge-50m.json"), marmara: await geoAsset("marmara-10m.json") },
};
const menuLinks: MenuLink[] = branches.map((b) => ({ slug: b.branch.slug, url: (l: Locale) => paths.menu(b.branch.slug, l, b.branch.default_locale) }));
for (const l of LOCALES) {
  await page(paths.site("home", l), renderHome(l, siteAssets));
  await page(paths.site("franchising", l), renderFranchising(l, siteAssets));
  await page(paths.site("branches", l), renderBranches(l, siteAssets, menuLinks));
  await page(paths.site("contact", l), renderContact(l, siteAssets));
}
for (const l of ["tr", "en"] as const) {
  await page(paths.site("brands", l), renderBrands(l, siteAssets));
  await page(paths.site("references", l), renderReferences(l, siteAssets));
  await page(paths.site("about", l), renderAbout(l, siteAssets));
  await page(paths.site("privacy", l), renderLegal("privacy", l, siteAssets));
  await page(paths.site("cookies", l), renderLegal("cookies", l, siteAssets));
}

// ─── Rapor ──────────────────────────────────────────────────────────────────
log(`${written.length} sayfa:`);
for (const w of written) log(`  ${w.url.padEnd(46)} ${kb(w.bytes).padStart(9)}  br ${kb(w.br)}`);
if (!existsSync(path.join(OUT, "video/hero-720.mp4"))) console.warn("  UYARI: ../video/hero-720.mp4 yok — npm run video");
console.log("tamam");
