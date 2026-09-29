/**
 * Fontlar — kendi barındırma, CDN yok. Her yüz yalnızca gereken karakterlere alt kümelenir; tarayıcı
 * unicode-range sayesinde sayfada geçen yazı sistemi için gereken dosyayı indirir.
 *
 *   Sofia Sans (değişken, gövde)                 → latin · tr (Ğ ğ İ Ş ş) · cyrillic
 *   Sofia Sans Extra Condensed (değişken, başlık)→ latin · tr · cyrillic   — logodaki dar yazıyla akraba
 *   IBM Plex Sans Arabic 400 / 700               → temel Arapça blok (yalnızca AR sayfaları)
 *   CH Lira                                      → yalnızca ₺ (Sofia Sans'ta yok; Plex'in glifi)
 *
 * Türkçe harfler fontsource'ta latin-ext dosyasında → ayrı küçük "tr" yüzü (~2 KB).
 * OFL: Reserved Font Name yok → alt kümeleme serbest. TEYİT: font seçimi marka onayı bekliyor.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import subsetFont from "subset-font";
import { paths, type Locale } from "../../src/config";
import type { Preload } from "../../src/render/document";
import { ASSETS, kb, log, nm, write } from "./out";

type Range = [number, number];
const R = (...ranges: Range[]) => ranges;
const LATIN = R([0x20, 0x7E], [0xA0, 0xFF], [0x131, 0x131], [0x152, 0x153], [0x2009, 0x200A], [0x2013, 0x2014], [0x2018, 0x201E],
  [0x2022, 0x2022], [0x2026, 0x2026], [0x2039, 0x203A], [0x202F, 0x202F], [0x20AC, 0x20AC], [0x2122, 0x2122], [0x2212, 0x2212]);
const TURKISH = R([0x11E, 0x11F], [0x130, 0x130], [0x15E, 0x15F]);
const CYRILLIC = R([0x400, 0x45F], [0x2116, 0x2116]);
/** Temel Arapça blok (harfler, harekeler, noktalama, Arapça rakamlar) + yön işaretleri — harfbuzz bağlamsal biçimleri (GSUB) korur */
const ARABIC = R([0x0600, 0x0605], [0x060C, 0x060C], [0x061B, 0x061F], [0x0621, 0x065F], [0x0660, 0x066D], [0x0670, 0x0670], [0x200C, 0x200F]);
const LIRA = R([0x20BA, 0x20BA]);

const text = (ranges: Range[]) => ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i))).join("");
const hex = (n: number) => n.toString(16).toUpperCase();
const unicodeRange = (ranges: Range[]) => ranges.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(",");

interface Face { file: string; from: string; family: string; weight: string; display: "swap" | "optional"; ranges: Range[] }
const V = "@fontsource-variable";
const FACES: Face[] = [
  { file: "sofia-latin.woff2", from: `${V}/sofia-sans/files/sofia-sans-latin-wght-normal.woff2`, family: "Sofia Sans", weight: "100 900", display: "swap", ranges: LATIN },
  { file: "sofia-tr.woff2", from: `${V}/sofia-sans/files/sofia-sans-latin-ext-wght-normal.woff2`, family: "Sofia Sans", weight: "100 900", display: "swap", ranges: TURKISH },
  { file: "sofia-cyrillic.woff2", from: `${V}/sofia-sans/files/sofia-sans-cyrillic-wght-normal.woff2`, family: "Sofia Sans", weight: "100 900", display: "swap", ranges: CYRILLIC },
  { file: "sofia-xc-latin.woff2", from: `${V}/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-latin-wght-normal.woff2`, family: "Sofia Sans Extra Condensed", weight: "100 900", display: "swap", ranges: LATIN },
  { file: "sofia-xc-tr.woff2", from: `${V}/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-latin-ext-wght-normal.woff2`, family: "Sofia Sans Extra Condensed", weight: "100 900", display: "swap", ranges: TURKISH },
  { file: "sofia-xc-cyrillic.woff2", from: `${V}/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-cyrillic-wght-normal.woff2`, family: "Sofia Sans Extra Condensed", weight: "100 900", display: "swap", ranges: CYRILLIC },
  // Arapça: optional — Arapça sistem fontlarının ölçüleri çok farklı, swap satır kırılımını kaydırır (CLS); önden yüklenir
  { file: "plex-arabic-400.woff2", from: "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2", family: "IBM Plex Sans Arabic", weight: "100 500", display: "optional", ranges: ARABIC },
  { file: "plex-arabic-700.woff2", from: "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2", family: "IBM Plex Sans Arabic", weight: "600 900", display: "optional", ranges: ARABIC },
  { file: "ch-lira.woff2", from: "@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-latin-ext-600-normal.woff2", family: "CH Lira", weight: "100 900", display: "swap", ranges: LIRA },
];

/** Ölçü eşlemeli yedek (Arial): font gelene kadar metin aynı yeri kaplar — değişimde kayma olmaz. */
async function fallback(family: string, woff: string): Promise<string> {
  const font = opentype.parse((await readFile(nm(woff))).buffer as ArrayBuffer);
  const upm = font.unitsPerEm;
  const os2 = font.tables.os2 as unknown as { xAvgCharWidth: number };
  const hhea = font.tables.hhea as unknown as { ascender: number; descender: number; lineGap: number };
  const arialAvg = 904 / 2048; // Arial OS/2 xAvgCharWidth / unitsPerEm
  const sizeAdjust = os2.xAvgCharWidth / upm / arialAvg;
  const pct = (v: number) => `${((v / upm / sizeAdjust) * 100).toFixed(2)}%`;
  return `@font-face{font-family:"${family} Fallback";src:local("Arial"),local("Helvetica Neue"),local("Roboto");size-adjust:${(sizeAdjust * 100).toFixed(2)}%;ascent-override:${pct(hhea.ascender)};descent-override:${pct(Math.abs(hhea.descender))};line-gap-override:${pct(hhea.lineGap)}}`;
}

export interface Fonts { css: string; preloads: Record<Locale, Preload[]> }

export async function buildFonts(): Promise<Fonts> {
  let css = "";
  let total = 0;
  for (const f of FACES) {
    const out = await subsetFont(await readFile(nm(f.from)), text(f.ranges), { targetFormat: "woff2" });
    await write(path.join(ASSETS, "fonts", f.file), out);
    total += out.length;
    css += `@font-face{font-family:"${f.family}";font-style:normal;font-display:${f.display};font-weight:${f.weight};src:url(${paths.asset(`fonts/${f.file}`)}) format("woff2");unicode-range:${unicodeRange(f.ranges)}}`;
  }
  css += await fallback("Sofia Sans", "@fontsource/sofia-sans/files/sofia-sans-latin-400-normal.woff");
  css += await fallback("Sofia Sans Extra Condensed", "@fontsource/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-latin-800-normal.woff");
  log(`fontlar: ${FACES.length} woff2 alt kümesi, toplam ${kb(total)} (sayfa başına yalnızca kendi yazı sistemi iner)`);

  const f = (file: string): Preload => ({ href: paths.asset(`fonts/${file}`), as: "font", type: "font/woff2" });
  return {
    css,
    preloads: {
      tr: [f("sofia-latin.woff2"), f("sofia-xc-latin.woff2"), f("sofia-tr.woff2")],
      en: [f("sofia-latin.woff2"), f("sofia-xc-latin.woff2")],
      // optional yüzler önden yüklenmezse ilk görüntülemede hiç kullanılmaz
      ar: [f("plex-arabic-400.woff2"), f("plex-arabic-700.woff2"), f("sofia-latin.woff2")],
      ru: [f("sofia-cyrillic.woff2"), f("sofia-xc-cyrillic.woff2"), f("sofia-latin.woff2")],
    },
  };
}

/** OG görselleri için opentype.js'in okuyabildiği statik woff dosyaları */
export const OG_FONTS = {
  display800: ["@fontsource/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-latin-800-normal.woff", "@fontsource/sofia-sans-extra-condensed/files/sofia-sans-extra-condensed-latin-ext-800-normal.woff"],
  body700: ["@fontsource/sofia-sans/files/sofia-sans-latin-700-normal.woff", "@fontsource/sofia-sans/files/sofia-sans-latin-ext-700-normal.woff"],
  body400: ["@fontsource/sofia-sans/files/sofia-sans-latin-400-normal.woff", "@fontsource/sofia-sans/files/sofia-sans-latin-ext-400-normal.woff"],
};

