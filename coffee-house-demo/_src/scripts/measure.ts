/**
 * Lighthouse (mobil) ölçümü → audit/coffee-house-lighthouse.json (brief §3: mevcut site vs yeni demo).
 * Sunum sayfası karşılaştırma kartını bu dosyadan basar; ölçülmemiş sayı yazılmaz.
 *
 *   npm run measure                       tüm hedefler
 *   npm run measure -- mevcut             yalnızca mevcut site (https://www.coffeehousetr.com/)
 *   npm run measure -- demo-site demo-menu demo-sunum   (npm run serve açıkken, :8790)
 *
 * Ön ayar: Lighthouse mobil (Moto G Power öykünmesi, simüle yavaş 4G, 4x CPU). 3 koşu, ortanca (performansa göre,
 * eşitlikte LCP). Mevcut dosyadaki diğer hedeflerin sonuçları korunur. Ham raporlar: .tmp/lighthouse/ (gitignore).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(SRC, "audit/coffee-house-lighthouse.json");
const RAW = path.join(SRC, ".tmp/lighthouse");
const LOCAL = process.env.ORIGIN ?? "http://localhost:8790";
const RUNS = Number(process.env.RUNS ?? 3);

const TARGETS: Record<string, { url: string; label: string }> = {
  "mevcut": { url: "https://www.coffeehousetr.com/", label: "Mevcut site — anasayfa" },
  "demo-site": { url: `${LOCAL}/coffee-house-demo/site/`, label: "Yeni site demosu — anasayfa" },
  "demo-menu": { url: `${LOCAL}/coffee-house-demo/menu/istanbul-laleli/`, label: "QR menü demosu — Laleli" },
  "demo-sunum": { url: `${LOCAL}/coffee-house-demo/`, label: "Sunum sayfası" },
};

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TARGETS);
for (const id of ids) if (!TARGETS[id]) throw new Error(`bilinmeyen hedef: ${id} (${Object.keys(TARGETS).join(", ")})`);
mkdirSync(RAW, { recursive: true });

interface Run {
  performance: number; accessibility: number; best_practices: number; seo: number;
  fcp_ms: number; lcp_ms: number; tbt_ms: number; cls: number; si_ms: number;
  total_kb: number; requests: number; lcp_element: string; version: string; fetched: string; file: string;
  /** Başarısız (ağırlıklı) SEO denetimleri ve bilinçli noindex hariç SEO puanı — demo sayfaları noindex */
  seo_failed: string[]; seo_excl_crawlable: number;
  opportunities: { id: string; title: string; savings_ms: number; savings_kb: number }[];
}

function run(url: string, file: string): Run {
  try {
    execFileSync("npx", ["--yes", "lighthouse@12", url, "--quiet", "--output=json", `--output-path=${file}`,
      "--only-categories=performance,accessibility,best-practices,seo", "--chrome-flags=--headless=new"], { stdio: ["ignore", "ignore", "pipe"], shell: true });
  } catch (e) {
    // Windows: chrome-launcher geçici profili silemeyince (EPERM) çıkış kodu 1 döner; rapor yoksa gerçek hatadır
    if (!existsSync(file)) throw e;
  }
  const r = JSON.parse(readFileSync(file, "utf8"));
  const a = r.audits;
  const score = (k: string) => Math.round(r.categories[k].score * 100);
  const seoRefs = (r.categories.seo.auditRefs as { id: string; weight: number }[]).filter((x) => x.weight > 0);
  const seoEx = seoRefs.filter((x) => x.id !== "is-crawlable");
  const seo_excl_crawlable = Math.round((100 * seoEx.reduce((s, x) => s + x.weight * (a[x.id].score ?? 0), 0)) / seoEx.reduce((s, x) => s + x.weight, 0));
  const seo_failed = seoRefs.filter((x) => a[x.id].score !== 1).map((x) => x.id);
  const opportunities = Object.values(a as Record<string, { id: string; title: string; details?: { type?: string; overallSavingsMs?: number; overallSavingsBytes?: number } }>)
    .filter((x) => x.details?.type === "opportunity" && ((x.details.overallSavingsMs ?? 0) > 0 || (x.details.overallSavingsBytes ?? 0) > 0))
    .map((x) => ({ id: x.id, title: x.title, savings_ms: Math.round(x.details!.overallSavingsMs ?? 0), savings_kb: Math.round((x.details!.overallSavingsBytes ?? 0) / 1024) }))
    .sort((p, q) => q.savings_ms - p.savings_ms || q.savings_kb - p.savings_kb)
    .slice(0, 6);
  return {
    performance: score("performance"), accessibility: score("accessibility"), best_practices: score("best-practices"), seo: score("seo"),
    fcp_ms: Math.round(a["first-contentful-paint"].numericValue),
    lcp_ms: Math.round(a["largest-contentful-paint"].numericValue),
    tbt_ms: Math.round(a["total-blocking-time"].numericValue),
    cls: Math.round(a["cumulative-layout-shift"].numericValue * 1000) / 1000,
    si_ms: Math.round(a["speed-index"].numericValue),
    total_kb: Math.round(a["total-byte-weight"].numericValue / 1024),
    requests: a["network-requests"]?.details?.items?.length ?? 0,
    lcp_element: String(a["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.nodeLabel ?? "").slice(0, 80),
    version: r.lighthouseVersion,
    fetched: r.fetchTime,
    file: path.relative(SRC, file).replace(/\\/g, "/"),
    opportunities, seo_failed, seo_excl_crawlable,
  };
}

const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { results: {} };
for (const id of ids) {
  const t = TARGETS[id];
  const runs: Run[] = [];
  for (let i = 1; i <= RUNS; i++) {
    const r = run(t.url, path.join(RAW, `${id}-${i}.json`));
    runs.push(r);
    console.log(`${id} koşu ${i}: perf ${r.performance} a11y ${r.accessibility} bp ${r.best_practices} seo ${r.seo} · LCP ${(r.lcp_ms / 1000).toFixed(1)} sn · TBT ${r.tbt_ms} ms · CLS ${r.cls} · ${(r.total_kb / 1024).toFixed(2)} MB, ${r.requests} istek`);
  }
  const sorted = [...runs].sort((a, b) => a.performance - b.performance || b.lcp_ms - a.lcp_ms);
  const m = sorted[Math.floor(sorted.length / 2)];
  existing.results[id] = {
    label: t.label, url: t.url, date: m.fetched.slice(0, 10), lighthouse_version: m.version, runs: RUNS,
    median: { performance: m.performance, accessibility: m.accessibility, best_practices: m.best_practices, seo: m.seo, seo_excl_crawlable: m.seo_excl_crawlable, seo_failed: m.seo_failed, fcp_ms: m.fcp_ms, lcp_ms: m.lcp_ms, tbt_ms: m.tbt_ms, cls: m.cls, si_ms: m.si_ms, total_kb: m.total_kb, requests: m.requests, lcp_element: m.lcp_element },
    all_runs: runs.map(({ performance, lcp_ms, total_kb }) => ({ performance, lcp_ms, total_kb })),
    top_opportunities: m.opportunities,
    local: t.url.startsWith(LOCAL),
  };
}
existing.method = "Lighthouse (CLI) mobil ön ayar: Moto G Power öykünmesi, simüle yavaş 4G, 4x CPU yavaşlatma; kategori puanları 0–100; her hedef için 3 koşunun ortancası. Yerel hedefler wrangler pages dev (:8790) üzerinden ölçüldü — yayında yeniden ölçülmeli.";
existing.generated = new Date().toISOString();
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(existing, null, 2) + "\n");
console.log(`yazıldı: ${path.relative(SRC, OUT)}`);
