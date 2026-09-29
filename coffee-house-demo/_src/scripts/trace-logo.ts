/**
 * TEK SEFERLİK: _ref/logo.png (sitedeki logo, 1237×1068 RGBA) → src/assets/coffee-house-logo.svg
 *
 * Logo yeniden çizilmez; potrace ile üç renk katmanı birebir izlenir:
 *   1. beyaz disk (saydam olmayan her piksel — koyu zeminde logonun iç beyazı korunur)
 *   2. mavi konuşma balonu halkası (ölçülen #4A8CC8)
 *   3. "COFFEE HOUSE / coffee & more" yazısı (ölçülen #151515)
 * Katman başına orijinalle örtüşme (IoU) raporlanır. Kaynak raster düşük çözünürlükten büyütülmüş (JPG artefaktlı);
 * izlenen vektör bir ara çözümdür — TEYİT: orijinal vektör logo markadan istenmeli.
 * Çalıştırma: npm run trace-logo
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Potrace } from "potrace";
import sharp from "sharp";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF = path.resolve(SRC, "../_ref/logo.png");
const OUT = path.join(SRC, "src/assets/coffee-house-logo.svg");
const SCALE = 3; // izleme öncesi büyütme: kenar merdivenleri ve JPG artefaktları eğriye dönüşmesin

export const LOGO_COLORS = { blue: "#4A8CC8", ink: "#151515", paper: "#FFFFFF" } as const;

const { data, info } = await sharp(REF).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;

type Pred = (r: number, g: number, b: number, a: number) => boolean;
/**
 * blur/tol: disk ve halka geometrik biçimlerdir — kaynağın gürültülü kenarı güçlü yumuşatmayla düzgün eğriye iner.
 * Yazı köşeli harflerdir — az yumuşatılır (köşeler yuvarlanmasın).
 */
const LAYERS: { key: keyof typeof LOGO_COLORS; test: Pred; turd: number; blur: number; tol: number }[] = [
  { key: "paper", test: (_r, _g, _b, a) => a >= 128, turd: 200, blur: 4, tol: 1.6 },
  { key: "blue", test: (r, _g, b, a) => a >= 128 && b - r > 55 && b > 120, turd: 80, blur: 3, tol: 1.2 },
  { key: "ink", test: (r, g, b, a) => a >= 128 && Math.max(r, g, b) < 110 && b - r < 40, turd: 20, blur: 1.2, tol: 0.6 },
];

/** Katman maskesi: özellik siyah, geri kalan beyaz (potrace blackOnWhite). */
function mask(test: Pred): Buffer {
  const out = Buffer.alloc(W * H);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) out[p] = test(data[i], data[i + 1], data[i + 2], data[i + 3]) ? 0 : 255;
  return out;
}

async function trace(m: Buffer, l: (typeof LAYERS)[number]): Promise<string> {
  const up = await sharp(m, { raw: { width: W, height: H, channels: 1 } })
    .resize(W * SCALE, H * SCALE, { kernel: "lanczos3" })
    .blur(l.blur)
    .png()
    .toBuffer();
  const tracer = new Potrace();
  tracer.setParameters({ threshold: 128, blackOnWhite: true, turdSize: l.turd, optCurve: true, optTolerance: l.tol, alphaMax: 1 });
  await new Promise<void>((res, rej) => tracer.loadImage(up, (err: Error | null) => (err ? rej(err) : res())));
  const d = tracer.getPathTag("#000").match(/ d="([^"]+)"/)?.[1];
  if (!d) throw new Error("potrace yol üretmedi");
  return d;
}

/**
 * Mutlak potrace yolu (M/L/C/Z) → tam sayıya yuvarlanmış göreli yol (m/l/c/z), en kısa ayraçlarla.
 * Büyütülmüş uzayda 1 birim = orijinalde 1/3 px; göreli koordinatlar çoğunlukla 1–3 hanelidir.
 */
function toRelative(d: string): string {
  const tokens = d.match(/[MLCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  let out = "", cmd = "", cx = 0, cy = 0, sx = 0, sy = 0, last = "";
  const nums: number[] = [];
  const emit = (c: string, values: number[]) => {
    let s = c === last && c !== "m" ? "" : c;
    for (const v of values) {
      const t = String(v);
      s += s === "" || /[a-z]$/.test(s) || t.startsWith("-") ? t : " " + t;
    }
    // Aynı komut tekrarında ilk sayı öncekinden ayrılmalı (eksi işareti yoksa boşluk)
    if (c === last && c !== "m" && !s.startsWith("-")) s = " " + s;
    out += s;
    last = c;
  };
  const flush = () => {
    const step = cmd === "C" ? 6 : 2;
    for (let i = 0; i + step <= nums.length; i += step) {
      const g = nums.slice(i, i + step).map(Math.round);
      if (cmd === "M" && i === 0) {
        emit("m", [g[0] - cx, g[1] - cy]);
        cx = sx = g[0]; cy = sy = g[1];
      } else if (cmd === "C") {
        emit("c", [g[0] - cx, g[1] - cy, g[2] - cx, g[3] - cy, g[4] - cx, g[5] - cy]);
        cx = g[4]; cy = g[5];
      } else {
        emit("l", [g[0] - cx, g[1] - cy]);
        cx = g[0]; cy = g[1];
      }
    }
    nums.length = 0;
  };
  for (const t of tokens) {
    if (/[MLCZ]/.test(t)) {
      flush();
      cmd = t;
      if (t === "Z") { out += "z"; last = "z"; cx = sx; cy = sy; }
    } else nums.push(Number(t));
  }
  flush();
  return out;
}

const absolute: Record<string, string> = {};
const paths: Record<string, string> = {};
for (const l of LAYERS) {
  absolute[l.key] = await trace(mask(l.test), l);
  paths[l.key] = toRelative(absolute[l.key]);
}

// viewBox: beyaz diskin sınır kutusu (kontrol noktaları dahil) + 1 px pay — mutlak yoldan
const nums = absolute.paper.match(/-?\d+(?:\.\d+)?/g)!.map((n) => Math.round(Number(n)));
const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
const pad = SCALE;
const vb = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: 0, h: 0 };
vb.w = Math.max(...xs) + pad - vb.x;
vb.h = Math.max(...ys) + pad - vb.y;

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">` +
  `<path fill="${LOGO_COLORS.paper}" d="${paths.paper}"/>` +
  `<path fill="${LOGO_COLORS.blue}" fill-rule="evenodd" d="${paths.blue}"/>` +
  `<path fill="${LOGO_COLORS.ink}" fill-rule="evenodd" d="${paths.ink}"/>` +
  `</svg>\n`;
await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, svg);

// Doğrulama: her katmanı tek başına rasterize et, orijinal maskeyle IoU
const fullBox = `viewBox="0 0 ${W * SCALE} ${H * SCALE}" width="${W}" height="${H}"`;
for (const l of LAYERS) {
  const single = `<svg xmlns="http://www.w3.org/2000/svg" ${fullBox}><rect width="100%" height="100%" fill="#fff"/><path fill="#000" fill-rule="evenodd" d="${paths[l.key]}"/></svg>`;
  const traced = await sharp(Buffer.from(single)).grayscale().threshold(128).raw().toBuffer();
  const orig = mask(l.test);
  let inter = 0, uni = 0;
  for (let i = 0; i < orig.length; i++) {
    const a = orig[i] === 0, b = traced[i] === 0;
    if (a && b) inter++;
    if (a || b) uni++;
  }
  console.log(`${l.key.padEnd(5)} IoU ${((inter / uni) * 100).toFixed(2)}%`);
}
console.log(`coffee-house-logo.svg: ${(svg.length / 1024).toFixed(1)} KB, viewBox ${vb.w}×${vb.h} (oran ${(vb.w / vb.h).toFixed(4)})`);
