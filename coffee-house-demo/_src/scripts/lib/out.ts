/** Build çıktı yardımcıları: yollar, yazma, içerik özeti, boyut raporu. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brotliCompressSync } from "node:zlib";
import { BASE } from "../../src/config";

export const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const OUT = path.resolve(SRC, "..");
export const REF = path.join(OUT, "_ref");
export const ASSETS = path.join(OUT, "assets");
export const nm = (p: string) => path.join(SRC, "node_modules", p);

export const hash = (buf: Buffer | string) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
export const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
export const log = (msg: string) => console.log(`  ${msg}`);

export async function write(file: string, data: string | Buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

/** URL yolu → çıktı dosyası. "/x/" → x/index.html, "/x/y" → x/y.html */
export function fileFor(urlPath: string): string {
  if (!urlPath.startsWith(BASE + "/")) throw new Error(`BASE dışı yol: ${urlPath}`);
  const rel = urlPath.slice(BASE.length + 1);
  return path.join(OUT, rel === "" || rel.endsWith("/") ? `${rel}index.html` : `${rel}.html`);
}

export const written: { url: string; bytes: number; br: number }[] = [];

/** Sayfa yaz: şablon girintisi (etiketler arası satır sonu + boşluk) kaldırılır, satır içi boşluklara dokunulmaz. */
export async function page(url: string, source: string) {
  const htmlStr = source.replace(/>\s*\n\s*</g, "><");
  if (written.some((w) => w.url === url)) throw new Error(`aynı yol iki kez üretildi: ${url}`);
  await write(fileFor(url), htmlStr);
  written.push({ url, bytes: Buffer.byteLength(htmlStr), br: brotliCompressSync(htmlStr).length });
}
