/**
 * Görseller: markanın kendi fotoğraflarından (_ref/galeri) kırpım → AVIF + WebP, responsive genişlikler.
 * Büyütme yapılmaz: kırpım kenarından geniş varyant üretilmez. Favicon seti logodan (izlenmiş SVG) üretilir.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { paths } from "../../src/config";
import { ASSETS, REF, SRC, hash, kb, log, write } from "./out";

import type { Responsive } from "../../src/render/types";
export type { Responsive };

interface Crop { x: number; y: number; w: number; h: number }

/**
 * @param key    çıktı adı (assets/img/<key>-<genişlik>.<uzantı>)
 * @param source _ref altındaki dosya (ör. "galeri/latte-art-kalpli.jpg")
 * @param crop   kaynaktaki bölge; null → tüm görsel
 */
export async function derive(key: string, source: string, crop: Crop | null, widths: number[], q = { avif: 55, webp: 74 }): Promise<Responsive> {
  const file = path.join(REF, source);
  const meta = await sharp(file).metadata();
  const c = crop ?? { x: 0, y: 0, w: meta.width!, h: meta.height! };
  if (c.x + c.w > meta.width! || c.y + c.h > meta.height!) throw new Error(`${key}: kırpım görselin dışında (${source})`);
  const usable = widths.filter((w) => w <= c.w);
  if (usable.length === 0) usable.push(c.w);
  const avif: string[] = [], webp: string[] = [];
  for (const w of usable) {
    const base = sharp(file).extract({ left: c.x, top: c.y, width: c.w, height: c.h }).resize({ width: w, kernel: "lanczos3" });
    const a = await base.clone().avif({ quality: q.avif, effort: 6 }).toBuffer();
    const b = await base.clone().webp({ quality: q.webp, effort: 6 }).toBuffer();
    await write(path.join(ASSETS, "img", `${key}-${w}.avif`), a);
    await write(path.join(ASSETS, "img", `${key}-${w}.webp`), b);
    avif.push(`${paths.asset(`img/${key}-${w}.avif`)} ${w}w`);
    webp.push(`${paths.asset(`img/${key}-${w}.webp`)} ${w}w`);
  }
  const mid = usable[Math.min(1, usable.length - 1)];
  return { avif: avif.join(", "), webp: webp.join(", "), src: paths.asset(`img/${key}-${mid}.webp`), w: mid, h: Math.round((mid * c.h) / c.w) };
}

/** Kare kırpım [x, y, kenar] — ürün görselleri */
export const square = ([x, y, s]: [number, number, number]): Crop => ({ x, y, w: s, h: s });

// ─── Logo + favicon seti ────────────────────────────────────────────────────
export interface Logo { url: string; svg: string }

export async function buildLogoAndIcons(): Promise<Logo> {
  const svg = await readFile(path.join(SRC, "src/assets/coffee-house-logo.svg"), "utf8");
  const name = `coffee-house-logo-${hash(svg)}.svg`;
  await write(path.join(ASSETS, name), svg);
  // SVG favicon: logonun kendisi (modern tarayıcılar); ICO: 16/32/48 PNG yüklü (eski tarayıcılar, Windows)
  await write(path.join(ASSETS, "icon.svg"), svg);
  const png = (size: number) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toBuffer();
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map(png));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  const ico = Buffer.concat([header, ...pngs]);
  await write(path.join(ASSETS, "favicon.ico"), ico);
  // apple-touch: iOS köşeleri kendisi yuvarlar; beyaz zemin, logo nefes payıyla
  const touchLogo = await sharp(Buffer.from(svg), { density: 300 }).resize(148, 148, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  const touch = await sharp({ create: { width: 180, height: 180, channels: 4, background: "#FFFFFF" } })
    .composite([{ input: touchLogo, gravity: "center" }]).png({ compressionLevel: 9 }).toBuffer();
  await write(path.join(ASSETS, "apple-touch-icon.png"), touch);
  log(`logo: ${name} ${kb(svg.length)} · favicon.ico ${kb(ico.length)} (16/32/48) · icon.svg · apple-touch 180 ${kb(touch.length)}`);
  return { url: paths.asset(name), svg };
}
