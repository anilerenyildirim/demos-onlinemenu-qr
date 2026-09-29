/**
 * TEK SEFERLİK (idempotent): markanın sitesindeki logo, tanıtım videosu ve 23 galeri görselini indirir,
 * data/gorseller.json'daki anlamlı adlarla ../_ref/ altına yazar. Var olan dosya yeniden indirilmez.
 *
 *   _ref/logo.png                     ← 123213213-2.png (1237×1068, RGBA)
 *   _ref/video/tanitim-orijinal.mp4   ← Adsiz-tasarim-7.mp4 (103 MB — gitignore; npm run video bundan üretir)
 *   _ref/galeri/<anlamlı-ad>.jpg      ← Adsiz-tasarim-N.jpg
 *
 * Kopya kontrolü: manifestte "kopya" işaretli görseller piksel düzeyinde karşılaştırılır (dosyalar yalnızca
 * EXIF'te farklı). Sonuç ekrana yazılır; kopyalar build'de kullanılmaz.
 * Çalıştırma: npm run fetch-assets
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF = path.resolve(SRC, "../_ref");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

interface Manifest {
  kaynak_taban: string;
  logo: { kaynak: string; dosya: string };
  video: { kaynak: string; dosya: string };
  gorseller: { kaynak: string; dosya: string; tur: string; kopyasi?: string }[];
}
const manifest: Manifest = JSON.parse(await readFile(path.join(SRC, "data/gorseller.json"), "utf8"));

async function download(url: string, file: string): Promise<"indi" | "vardı"> {
  if (existsSync(file)) return "vardı";
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return "indi";
}

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

console.log(`logo: ${await download(manifest.logo.kaynak, path.join(REF, manifest.logo.dosya))}`);
console.log(`video: ${await download(manifest.video.kaynak, path.join(REF, manifest.video.dosya))} (büyük dosya — yalnızca npm run video için)`);

for (const g of manifest.gorseller) {
  const file = path.join(REF, "galeri", g.dosya);
  const state = await download(manifest.kaynak_taban + g.kaynak, file);
  const meta = await sharp(file).metadata();
  const size = (await readFile(file)).length;
  console.log(`${g.kaynak.padEnd(22)} → ${g.dosya.padEnd(44)} ${meta.width}×${meta.height} ${kb(size).padStart(7)}  ${state}`);
}

// Kopyalar: EXIF farkı dışında aynı mı? (ham piksel karşılaştırması)
const pixels = async (dosya: string) => sharp(path.join(REF, "galeri", dosya)).raw().toBuffer();
for (const g of manifest.gorseller.filter((x) => x.kopyasi)) {
  const asil = manifest.gorseller.find((x) => x.kaynak === g.kopyasi);
  if (!asil) throw new Error(`kopyası bulunamadı: ${g.kopyasi}`);
  const [a, b] = [await pixels(asil.dosya), await pixels(g.dosya)];
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff = Math.max(diff, Math.abs(a[i] - b[i]));
  const verdict = a.length === b.length && diff <= 2 ? "piksel olarak aynı" : `FARKLI (en büyük fark ${diff})`;
  console.log(`kopya: ${g.kaynak} ↔ ${asil.kaynak}: ${verdict}`);
}
