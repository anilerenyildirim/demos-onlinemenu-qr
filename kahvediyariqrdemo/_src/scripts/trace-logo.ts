/**
 * Tek seferlik: _ref/logo.jpg → src/assets/logo-mark.svg (monogram, currentColor, kırpılmış)
 *                               + src/assets/logo-app.svg (orijinal kare kompozisyon, teal zemin)
 * Logo yeniden çizilmez; potrace ile birebir izlenir ve orijinalle piksel örtüşmesi raporlanır.
 * Çalıştırma: npm run trace-logo
 */
import sharp from "sharp";
import { Potrace } from "potrace";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const REF = path.resolve(root, "../../_ref/logo.jpg");
const OUT = path.resolve(root, "../src/assets/logo-mark.svg");
const SCALE = 4; // izleme öncesi büyütme — JPG kenar merdivenlerini yumuşatır

const src = sharp(REF);
const { width = 0, height = 0 } = await src.metadata();

// Gri tonlamaya çevir, 4x büyüt, hafif bulanıklaştır: JPG artefaktları eğriye dönüşmesin.
const up = await src
  .clone()
  .grayscale()
  .resize(width * SCALE, height * SCALE, { kernel: "lanczos3" })
  .blur(1.2)
  .png()
  .toBuffer();

const tracer = new Potrace();
tracer.setParameters({
  threshold: 128,
  blackOnWhite: false, // açık renkli monogramı izle
  turdSize: 40,
  optCurve: true,
  optTolerance: 0.4,
  alphaMax: 1,
});

await new Promise<void>((res, rej) => tracer.loadImage(up, (err) => (err ? rej(err) : res())));
const rawD = tracer.getPathTag("#fff").match(/ d="([^"]+)"/)?.[1];
if (!rawD) throw new Error("potrace yol üretmedi");

// Koordinatları tam sayıya yuvarla (1788 birimlik alanda 1 birim ≈ orijinalde 0,25 px) ve sıkıştır.
const d = rawD
  .replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))))
  .replace(/,\s*/g, " ")
  .replace(/\s*([MCLZ])\s*/g, "$1")
  .trim();

// Monogramın sınır kutusu (kontrol noktaları dahil — güvenli taraf).
const nums = d.match(/-?\d+/g)!.map(Number);
const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
const pad = 8;
const minX = Math.min(...xs) - pad, minY = Math.min(...ys) - pad;
const bw = Math.max(...xs) + pad - minX, bh = Math.max(...ys) + pad - minY;

const size = width * SCALE;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${bw} ${bh}">` +
  `<path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>\n`;
// Uygulama ikonu / favicon: orijinal kare kompozisyon, ölçülen logo zemini #06514D.
const app =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">` +
  `<rect width="${size}" height="${size}" fill="#06514D"/>` +
  `<path fill="#fff" fill-rule="evenodd" d="${d}"/></svg>\n`;

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, svg);
await writeFile(OUT.replace("logo-mark", "logo-app"), app);

// Doğrulama: SVG'yi orijinal çözünürlükte rasterize et, eşiklenmiş orijinalle IoU hesapla.
const toMask = async (buf: Buffer) =>
  sharp(buf).resize(width, height).grayscale().threshold(128).raw().toBuffer();
const orig = await toMask(await sharp(REF).png().toBuffer());
const traced = await toMask(
  await sharp(Buffer.from(app.replace("#06514D", "#000"))).png().toBuffer(),
);
let inter = 0, uni = 0;
for (let i = 0; i < orig.length; i++) {
  const a = orig[i] > 0, b = traced[i] > 0;
  if (a && b) inter++;
  if (a || b) uni++;
}
console.log(`logo-mark.svg: ${svg.length} bayt, logo-app.svg: ${app.length} bayt, orijinalle örtüşme (IoU) ${((inter / uni) * 100).toFixed(2)}%`);
