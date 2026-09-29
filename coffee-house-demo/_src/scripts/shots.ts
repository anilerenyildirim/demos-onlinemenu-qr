/**
 * Görsel kontrol: yerel Chrome'u başsız sürerek ekran görüntüsü alır (npm run serve açıkken).
 *
 *   npx tsx scripts/shots.ts <cihaz> <yol>[|<js>] …      cihaz: mobile | desktop | mobile-full | desktop-full
 *   ör. npx tsx scripts/shots.ts mobile "/coffee-house-demo/menu/dubai/|document.querySelector('[data-open]').click()"
 *
 * Çıktı: .tmp/shots/<ad>.png (gitignore). <js> sayfa yüklendikten sonra çalışır, 500 ms beklenir.
 * "-full": sayfa gerçek viewport'ta kaydırılıp dilim dilim çekilir ve birleştirilir (Puppeteer'ın fullPage modu
 * viewport'u sayfa boyuna uzatır → 100svh bölümler şişer; bu yöntem gerçek görünümü verir).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(SRC, ".tmp/shots");
const ORIGIN = process.env.ORIGIN ?? "http://localhost:8790";
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const [device, ...targets] = process.argv.slice(2);
const full = device.endsWith("-full");
const mobile = device.startsWith("mobile");
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars", "--lang=tr-TR"] });
try {
  for (const t of targets) {
    const [p, script] = t.split("|");
    const page = await browser.newPage();
    await page.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warn") errors.push(`${m.type()}: ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`pageerror: ${(e as Error).message}`));
    page.on("requestfailed", (r) => errors.push(`requestfailed: ${r.url()}`));
    await page.goto(ORIGIN + p, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    if (script) {
      try { await page.evaluate(`(async () => { ${script} })()`); } catch (e) { errors.push(`script: ${(e as Error).message}`); }
      await new Promise((r) => setTimeout(r, 500));
    }
    const name = `${device}-${p.replace(/^\/coffee-house-demo\/?/, "").replace(/[\/]+/g, "_").replace(/_$/, "") || "sunum"}${script ? "-js" : ""}.png`;
    if (!full) await page.screenshot({ path: path.join(OUT, name) as `${string}.png` });
    else {
      const vh = page.viewport()!.height, dpr = page.viewport()!.deviceScaleFactor ?? 1;
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const slices: Buffer[] = [];
      for (let y = 0; y < total; y += vh) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
        await new Promise((r) => setTimeout(r, 350));
        slices.push(Buffer.from(await page.screenshot({ type: "png" })));
      }
      const last = total % vh;
      const metas = await Promise.all(slices.map((b) => sharp(b).metadata()));
      const w = metas[0].width!;
      const cut = (i: number) => (i === slices.length - 1 && last ? Math.round(last * dpr) : metas[i].height!);
      // son dilim sayfa sonuna hizalanır → üstteki tekrar eden kısım kırpılır
      const parts = await Promise.all(slices.map(async (b, i) => (i === slices.length - 1 && last ? sharp(b).extract({ left: 0, top: metas[i].height! - cut(i), width: w, height: cut(i) }).toBuffer() : b)));
      let top = 0;
      const composite = parts.map((input, i) => { const o = { input, left: 0, top }; top += cut(i); return o; });
      await sharp({ create: { width: w, height: top, channels: 3, background: "#fff" } }).composite(composite).png().toFile(path.join(OUT, name));
    }
    console.log(`${name}${errors.length ? "\n  " + errors.join("\n  ") : ""}`);
    await page.close();
  }
} finally {
  await browser.close();
}
