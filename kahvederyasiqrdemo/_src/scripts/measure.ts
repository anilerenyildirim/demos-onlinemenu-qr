/**
 * Bu demonun kendi ölçümü → data/olcum.json → build teknik şeride basar.
 * Başka hiçbir sitenin ölçümü yapılmaz ve yazılmaz.
 *
 *   npm run serve          (ayrı terminalde; repo kökünü wrangler pages dev ile sunar)
 *   npm run measure        (varsayılan: http://localhost:8789/kahvederyasiqrdemo/ ; argümanla başka URL)
 *   npm run build          (şerit yeni değerlerle yeniden üretilir)
 *
 * Lighthouse mobil ön ayarı: Moto G Power öykünmesi, simüle yavaş 4G, 4x CPU yavaşlatma. 3 koşu, medyan (performansa göre).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_URL = "http://localhost:8789/kahvederyasiqrdemo/";
const url = process.argv[2] ?? DEFAULT_URL;
/** Teknik şerit giriş sayfasının ölçümünü gösterir; başka URL ölçülürse sonuç yalnızca ekrana yazılır. */
const WRITE = url === DEFAULT_URL;
const RUNS = Number(process.env.RUNS ?? 3);
const tmp = mkdtempSync(path.join(tmpdir(), "lh-"));

interface Run { performance: number; accessibility: number; best_practices: number; lcp_ms: number; cls: number; lcp_el: string; initial_kb: number; version: string; requests: string[] }

const runs: Run[] = [];
for (let i = 0; i < RUNS; i++) {
  const out = path.join(tmp, `lh-${i}.json`);
  try {
    execFileSync("npx", ["--yes", "lighthouse@12", url, "--quiet", "--output=json", `--output-path=${out}`,
      "--only-categories=performance,accessibility,best-practices", "--chrome-flags=--headless=new"], { stdio: ["ignore", "inherit", "pipe"], shell: true });
  } catch (e) {
    // Windows: chrome-launcher rapor yazıldıktan sonra geçici profili silemeyince (EPERM) çıkış kodu 1 döner.
    // Rapor dosyası yoksa gerçek hatadır.
    if (!existsSync(out)) throw e;
  }
  const r = JSON.parse(readFileSync(out, "utf8"));
  const items = r.audits["network-requests"]?.details?.items ?? [];
  runs.push({
    performance: Math.round(r.categories.performance.score * 100),
    accessibility: Math.round(r.categories.accessibility.score * 100),
    best_practices: Math.round(r.categories["best-practices"].score * 100),
    lcp_ms: Math.round(r.audits["largest-contentful-paint"].numericValue),
    cls: Math.round(r.audits["cumulative-layout-shift"].numericValue * 1000) / 1000,
    lcp_el: String(r.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.nodeLabel ?? "").slice(0, 60),
    initial_kb: r.audits["total-byte-weight"].numericValue / 1024,
    version: r.lighthouseVersion,
    requests: items.map((x: { url: string; transferSize: number }) => `${x.transferSize}\t${x.url}`),
  });
  const last = runs[runs.length - 1];
  console.log(`koşu ${i + 1}: perf ${last.performance} a11y ${last.accessibility} bp ${last.best_practices} LCP ${last.lcp_ms} ms (${last.lcp_el}), CLS ${last.cls}, ${last.initial_kb.toFixed(1)} KB`);
}
runs.sort((a, b) => a.performance - b.performance || a.lcp_ms - b.lcp_ms);
const m = runs[Math.floor(runs.length / 2)];
const external = m.requests.filter((l) => !l.split("\t")[1].startsWith(new URL(url).origin));

const result = {
  url,
  lighthouse_version: m.version,
  date: new Date().toISOString().slice(0, 10),
  performance: m.performance,
  accessibility: m.accessibility,
  best_practices: m.best_practices,
  lcp_ms: m.lcp_ms,
  cls: m.cls,
  initial_kb: Math.round(m.initial_kb * 10) / 10,
  runs: runs.length,
};
if (WRITE) writeFileSync(path.join(SRC, "data/olcum.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
console.log(`\nistekler (${m.requests.length}), dış kaynak: ${external.length}`);
for (const l of m.requests) console.log("  " + l);
