/**
 * Açık Graph görselleri (1200×630) — WhatsApp / e-posta önizlemesi. Metin opentype.js ile path'e çevrilir
 * (sunucuda font gerekmez, önizleme her yerde aynı). Hepsinde "DEMO — onlinemenu-qr.com" ibaresi var.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import sharp, { type OverlayOptions, type Sharp } from "sharp";
import { BASE } from "../../src/config";
import { OG_FONTS } from "./fonts";
import { OUT, REF, kb, log, nm, write } from "./out";

export const OG = { width: 1200, height: 630 };
const INK = "#151515", BLUE = "#4A8CC8", NEON = "#F37411", PAPER = "#FFFFFF", NIGHT = "#05080C";

const cache = new Map<string, opentype.Font[]>();
async function faces(key: keyof typeof OG_FONTS) {
  if (!cache.has(key)) cache.set(key, await Promise.all(OG_FONTS[key].map(async (f) => opentype.parse((await readFile(nm(f))).buffer as ArrayBuffer))));
  return cache.get(key)!;
}

/** Metin → SVG path. toPathData bazı değerlerde "NaN" yazıyor → komutlardan kendimiz yazarız. */
export async function textPath(text: string, size: number, x: number, y: number, font: keyof typeof OG_FONTS, fill: string, tracking = 0) {
  const fs = await faces(font);
  const n = (v: number) => String(Math.round(v * 10) / 10);
  let d = "", cx = x;
  for (const ch of text) {
    const f = fs.find((ff) => ff.charToGlyphIndex(ch) > 0) ?? fs[0];
    const glyph = f.charToGlyph(ch);
    for (const c of glyph.getPath(cx, y, size).commands) {
      if (c.type === "M" || c.type === "L") d += `${c.type}${n(c.x)} ${n(c.y)}`;
      else if (c.type === "Q") d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
      else if (c.type === "C") d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
      else d += "Z";
    }
    cx += (glyph.advanceWidth ?? 0) * (size / f.unitsPerEm) + tracking;
  }
  return { svg: `<path fill="${fill}" d="${d}"/>`, width: cx - x - tracking };
}

/** Konuşma balonu maskesi: daire, bir köşesi sivri (logonun biçimi) */
const bubblePath = (x: number, y: number, s: number) => {
  const r = s / 2, t = s * 0.1;
  return `M${x + r} ${y}A${r} ${r} 0 0 1 ${x + s} ${y + r}A${r} ${r} 0 0 1 ${x + r} ${y + s}H${x + t}Q${x} ${y + s} ${x} ${y + s - t}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
};

async function bubbleImage(source: string, crop: [number, number, number], size: number) {
  const [x, y, s] = crop;
  const img = await sharp(path.join(REF, source)).extract({ left: x, top: y, width: s, height: s }).resize(size, size).png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="${bubblePath(0, 0, size)}" fill="#fff"/></svg>`);
  return sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function demoPill(x: number, y: number, dark: boolean) {
  const label = await textPath("DEMO — onlinemenu-qr.com", 22, x + 40, y + 31, "body700", dark ? PAPER : INK);
  return `<rect x="${x}" y="${y}" width="${label.width + 60}" height="46" rx="23" fill="${dark ? "#1B1F24" : PAPER}" stroke="${dark ? "#3A4048" : "#D9D4CC"}"/><circle cx="${x + 22}" cy="${y + 23}" r="6" fill="${NEON}"/>${label.svg}`;
}

async function finish(name: string, base: Sharp, overlays: OverlayOptions[]) {
  const out = await base.composite(overlays).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  await write(path.join(OUT, name), out);
  log(`${name}: ${kb(out.length)}`);
  return `${BASE}/${name}`;
}

/** Sunum kapağı: başlık + iki logo + logonun halkası */
export async function ogBrief(logoSvg: string) {
  const { width: W, height: H } = OG;
  const lines = ["COFFEE HOUSE İÇİN", "DİJİTAL OPERASYON", "ÖNERİSİ"];
  const titles = await Promise.all(lines.map((l, i) => textPath(l, 92, 72, 200 + i * 88, "display800", INK)));
  const date = await textPath("Hazırlanma tarihi: 29 Eylül 2026", 26, 72, 492, "body400", "#5B5650");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <circle cx="${W - 150}" cy="${H / 2 - 10}" r="300" fill="none" stroke="${BLUE}" stroke-width="64"/>
    ${titles.map((t) => t.svg).join("")}${date.svg}${await demoPill(72, 530, false)}
  </svg>`;
  const logo = await sharp(Buffer.from(logoSvg), { density: 300 }).resize(330, 330).png().toBuffer();
  return finish("og.jpg", sharp(Buffer.from(svg)), [{ input: logo, left: W - 150 - 165, top: Math.round(H / 2 - 10 - 165) }]);
}

/** Menü: logo + başlık + balon biçimli üç ürün fotoğrafı */
export async function ogMenu(logoSvg: string, shots: { source: string; crop: [number, number, number] }[], counts: { branches: number; locales: number; currencies: number }) {
  const { width: W, height: H } = OG;
  const t1 = await textPath("QR MENÜ", 124, 72, 318, "display800", INK);
  const t2 = await textPath("DEMOSU", 124, 72, 430, "display800", INK);
  const sub = await textPath(`${counts.branches} şube · ${counts.locales} dil · ${counts.currencies} para birimi · tek merkez katalog`, 26, 72, 486, "body700", "#5B5650");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>${t1.svg}${t2.svg}${sub.svg}${await demoPill(72, 530, false)}</svg>`;
  const logo = await sharp(Buffer.from(logoSvg), { density: 300 }).resize(150, 150).png().toBuffer();
  const imgs = await Promise.all(shots.map((s, i) => bubbleImage(s.source, s.crop, [300, 230, 230][i])));
  return finish("og-menu.jpg", sharp(Buffer.from(svg)), [
    { input: logo, left: 72, top: 60 },
    { input: imgs[0], left: 640, top: 70 },
    { input: imgs[1], left: 930, top: 40 },
    { input: imgs[2], left: 900, top: 330 },
  ]);
}

/** Site: gece zemini, konuşma balonu penceresinde tanıtım karesi, değer önerisi */
export async function ogSite(name: string, logoSvg: string, poster: string, lines: string[], sub: string) {
  const { width: W, height: H } = OG;
  const titles = await Promise.all(lines.map((l, i) => textPath(l, 84, 72, 250 + i * 82, "display800", PAPER)));
  const s = await textPath(sub, 26, 72, 250 + lines.length * 82 + 8, "body700", "#C9CDD3");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${NIGHT}"/>
    <path d="${bubblePath(W - 490, 70, 440)}" fill="none" stroke="${BLUE}" stroke-width="34"/>
    ${titles.map((t) => t.svg).join("")}${s.svg}${await demoPill(72, 530, true)}</svg>`;
  const logo = await sharp(Buffer.from(logoSvg), { density: 300 }).resize(120, 120).png().toBuffer();
  const size = 440 - 34;
  const img = await sharp(path.join(REF, poster)).resize(size, size).png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="${bubblePath(0, 0, size)}" fill="#fff"/></svg>`);
  const bubble = await sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return finish(name, sharp(Buffer.from(svg)), [
    { input: bubble, left: W - 490 + 17, top: 70 + 17 },
    { input: logo, left: 72, top: 56 },
  ]);
}
