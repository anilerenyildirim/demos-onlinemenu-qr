/**
 * ADIM 0 — tek seferlik veri + görsel toplama. Build sürecine BAĞLI DEĞİL; elle çalıştırılır:
 *
 *   npm run scrape-assets
 *
 * Kaynak: https://kahvederyasi.com.tr — yalnızca aşağıdaki sayfalar çekilir:
 *   4 kategori sayfası · yurtiçi şube listesi ?page=1..7 · 6 demo şubesinin detay sayfası
 *   + bu sayfalarda referans verilen ürün görselleri ve başlıktaki logo.
 *
 * Nezaket: istekler sıralı (paralel yok), aralarında en az REQUEST_GAP_MS, tanımlayıcı User-Agent,
 * robots.txt okunur ve uyulur.
 *
 * İdempotent: HTML ve ham görseller _ref/scraped/ altında önbelleklenir; var olan dosya yeniden
 * indirilmez, var olan WebP/AVIF çıktısı yeniden üretilmez. Sıfırdan almak için ilgili dosyayı sil.
 *
 * Çıktılar
 *   ../_ref/scraped/html/…                     ham HTML (gitignore)
 *   ../_ref/scraped/<kategori>/…               ham ürün görselleri (gitignore)
 *   ../_ref/logo.png                           başlıktaki resmi logo
 *   ../urunler/<kategori>/<slug>-<w>.{webp,avif}   yayınlanan ürün görselleri (4:5; 320/480/720w, kaynaktan büyük olanlar atlanır)
 *   data/urunler.json                          ürün adı → kaynak URL → yerel dosya eşlemesi
 *   data/subeler-tam.json                      yurtiçi şube listesi (+ 6 demo şubesinin tam detayı)
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type Sharp } from "sharp";

const ORIGIN = "https://kahvederyasi.com.tr";
const UA = "onlinemenu-qr-demo-hazirlik/1.0 (+https://onlinemenu-qr.com; teklif demosu icin tek seferlik veri toplama)";
const REQUEST_GAP_MS = 800;

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEMO = path.resolve(SRC, "..");
const RAW = path.join(DEMO, "_ref/scraped");
const OUT_IMG = path.join(DEMO, "urunler");
const DATA = path.join(SRC, "data");

const CATEGORIES = [
  { slug: "sicak-icecekler", url: `${ORIGIN}/sicak-icecekler` },
  { slug: "soguk-icecekler", url: `${ORIGIN}/soguk-icecekler` },
  { slug: "yemekler", url: `${ORIGIN}/yemekler` },
  { slug: "pastalar", url: `${ORIGIN}/pastalar` },
] as const;
const BRANCH_PAGES = [1, 2, 3, 4, 5, 6, 7].map((p) => `${ORIGIN}/tum-magazalar/yurtici-subeler?page=${p}`);
const DEMO_BRANCHES = [
  "İstanbul Büyükçekmece Şubesi",
  "Balıkesir Merkez Şubesi",
  "Aydın Nazilli Bamboo AVM Şubesi",
  "Antalya Manavgat Şubesi",
  "Bitlis Tatvan Şubesi",
  "Batman Şubesi",
];
const LOGO_URL = `${ORIGIN}/image/catalog/sistem/logo.png`;

/** Görsel çıktısı: 4:5 kırpma, bu genişlikler. Kaynaktan büyütme yapılmaz. */
const WIDTHS = [320, 480, 720] as const;
const RATIO = 4 / 5;
const BUDGET = { webp: 60 * 1024, avif: 40 * 1024 };
const QUALITY = { webp: [80, 76, 72, 68, 64, 60], avif: [52, 48, 44, 40, 36] };

// ─── HTTP: sıralı, aralıklı, robots.txt'e uyan ──────────────────────────────
let lastRequest = 0;
let disallow: string[] | null = null;
let requestCount = 0;

async function politeFetch(url: string): Promise<Response> {
  const wait = lastRequest + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  requestCount++;
  return fetch(url, { headers: { "User-Agent": UA, Accept: "*/*" }, redirect: "follow" });
}

async function loadRobots() {
  const file = path.join(RAW, "html/robots.txt");
  let body: string | null = null;
  if (existsSync(file)) body = await readFile(file, "utf8");
  else {
    const res = await politeFetch(`${ORIGIN}/robots.txt`);
    body = res.ok ? await res.text() : "";
    await save(file, body);
    console.log(`robots.txt: HTTP ${res.status}${res.ok ? "" : " → kısıt yok"}`);
  }
  // Yalnızca "User-agent: *" grubunun Disallow satırları (bizim UA'ya özel grup yok)
  disallow = [];
  let applies = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    if (/^user-agent$/i.test(key)) applies = value === "*";
    else if (applies && /^disallow$/i.test(key) && value) disallow.push(value);
  }
}

function allowed(url: string) {
  const u = new URL(url);
  const p = u.pathname + u.search;
  return !disallow!.some((rule) => p.startsWith(rule));
}

async function save(file: string, data: string | Buffer) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, data);
}

/** HTML'i önbellekten ya da siteden getirir. */
async function getHtml(url: string, cacheName: string): Promise<string> {
  const file = path.join(RAW, "html", cacheName);
  if (existsSync(file)) return readFile(file, "utf8");
  if (!allowed(url)) throw new Error(`robots.txt izin vermiyor: ${url}`);
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const html = await res.text();
  await save(file, html);
  console.log(`  ↓ ${url}`);
  return html;
}

/** İkili dosyayı önbellekten ya da siteden getirir; 404 vb. durumda null. */
async function getBinary(url: string, file: string): Promise<{ buf: Buffer; fetched: boolean } | { status: number }> {
  if (existsSync(file)) return { buf: await readFile(file), fetched: false };
  if (!allowed(url)) return { status: 0 };
  const res = await politeFetch(url);
  if (!res.ok) return { status: res.status };
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return { status: -1 };
  const buf = Buffer.from(await res.arrayBuffer());
  await save(file, buf);
  return { buf, fetched: true };
}

// ─── HTML yardımcıları ──────────────────────────────────────────────────────
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
function decode(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+|#39);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
const text = (html: string) => decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, ""));

/** Türkçe karakterleri ASCII'ye çevirip dosya adı üretir. Yalnızca dosya adı içindir; görünen ad aynen korunur. */
function slugify(name: string) {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
  return name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]|i̇/g, (c) => map[c] ?? c)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "-ve-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── 1. Ürünler ─────────────────────────────────────────────────────────────
type ImageOut = { w: number; h: number; webp: string; avif: string; webp_bytes: number; avif_bytes: number; /** null: dosya önceki bir çalıştırmada üretildi, yeniden kodlanmadı */ webp_q: number | null; avif_q: number | null };
type ProductRecord = {
  kategori: string;
  sira: number;
  ad: string;
  slug: string;
  kaynak_url: string | null;
  kullanilan: "orijinal" | "cache" | "yer-tutucu";
  orijinal_deneme: string | null;
  ham_dosya: string | null;
  kaynak_boyut: { w: number; h: number } | null;
  cikti: ImageOut[];
  not?: string;
};

function parseProducts(html: string) {
  const out: { ad: string; img: string }[] = [];
  const blocks = html.split(/<div class="gallery_img">/).slice(1);
  for (const block of blocks) {
    const body = block.split(/<div class="col-/)[0];
    const img = body.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const visible = body.match(/<p class="text-center">([\s\S]*?)<\/p>/)?.[1];
    const fallback = body.match(/data-title="([^"]*)"/)?.[1] ?? body.match(/alt="([^"]*)"/)?.[1];
    const ad = decode((visible ?? fallback ?? "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!ad) continue;
    out.push({ ad, img: img ? new URL(decode(img), ORIGIN).href : "" });
  }
  return out;
}

async function encodeWithin(pipeline: Sharp,format: "webp" | "avif") {
  let last: { buf: Buffer; q: number } | null = null;
  for (const q of QUALITY[format]) {
    const buf = format === "webp"
      ? await pipeline.clone().webp({ quality: q, effort: 6 }).toBuffer()
      : await pipeline.clone().avif({ quality: q, effort: 6 }).toBuffer();
    last = { buf, q };
    if (buf.length <= BUDGET[format]) break;
  }
  return last!;
}

async function writeVariants(source: Buffer, kategori: string, slug: string): Promise<ImageOut[]> {
  const meta = await sharp(source).metadata();
  const sw = meta.width ?? 0, sh = meta.height ?? 0;
  // 4:5 merkez kırpma
  let cw = sw, ch = Math.round(sw / RATIO);
  if (ch > sh) { ch = sh; cw = Math.round(sh * RATIO); }
  const left = Math.floor((sw - cw) / 2), top = Math.floor((sh - ch) / 2);
  const base = sharp(source).rotate().extract({ left, top, width: cw, height: ch }).toColourspace("srgb");

  const outs: ImageOut[] = [];
  for (const w of WIDTHS) {
    if (w > cw) continue; // büyütme yok
    const h = Math.round(w / RATIO);
    const rel = (ext: string) => `urunler/${kategori}/${slug}-${w}.${ext}`;
    const webpFile = path.join(DEMO, rel("webp")), avifFile = path.join(DEMO, rel("avif"));
    const pipe = base.clone().resize(w, h, { fit: "fill", kernel: "lanczos3" });
    let webp_q: number | null = null, avif_q: number | null = null;
    if (!existsSync(webpFile)) { const r = await encodeWithin(pipe, "webp"); await save(webpFile, r.buf); webp_q = r.q; }
    if (!existsSync(avifFile)) { const r = await encodeWithin(pipe, "avif"); await save(avifFile, r.buf); avif_q = r.q; }
    outs.push({ w, h, webp: rel("webp"), avif: rel("avif"), webp_bytes: (await stat(webpFile)).size, avif_bytes: (await stat(avifFile)).size, webp_q, avif_q });
  }
  return outs;
}

/** İndirilemeyen ürün için soyut yer tutucu: paletle uyumlu degrade + baş harf. // TEYİT: palet onayı bekliyor */
function placeholderSvg(ad: string, w: number, h: number) {
  const letter = [...ad.trim()][0]?.toLocaleUpperCase("tr") ?? "?";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C1620"/><stop offset="1" stop-color="#0E0E12"/></linearGradient>
      <radialGradient id="r" cx=".3" cy=".2" r=".8"><stop offset="0" stop-color="#E6007E" stop-opacity=".28"/><stop offset="1" stop-color="#E6007E" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#r)"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="600" font-size="${Math.round(w * 0.42)}" fill="#D9A441" fill-opacity=".85">${letter}</text>
  </svg>`);
}

async function scrapeProducts() {
  const records: ProductRecord[] = [];
  for (const cat of CATEGORIES) {
    const html = await getHtml(cat.url, `${cat.slug}.html`);
    const items = parseProducts(html);
    console.log(`${cat.slug}: ${items.length} ürün`);
    const used = new Set<string>();
    for (const [i, it] of items.entries()) {
      let slug = slugify(it.ad);
      for (let n = 2; used.has(slug); n++) slug = `${slugify(it.ad)}-${n}`;
      used.add(slug);

      const rec: ProductRecord = {
        kategori: cat.slug, sira: i + 1, ad: it.ad, slug,
        kaynak_url: null, kullanilan: "yer-tutucu", orijinal_deneme: null, ham_dosya: null, kaynak_boyut: null, cikti: [],
      };

      let source: Buffer | null = null;
      if (it.img) {
        const cacheUrl = it.img;
        // Orijinal: /image/cache/catalog/... + "-600x740" → /image/catalog/...
        const originalUrl = cacheUrl.replace("/image/cache/catalog/", "/image/catalog/").replace(/-\d+x\d+(\.[a-z]+)$/i, "$1");
        rec.orijinal_deneme = originalUrl;
        const rawRel = (u: string, kind: string) =>
          path.join(cat.slug, kind, decodeURIComponent(new URL(u).pathname).replace(/^\/image\/(cache\/)?catalog\/urunler\/[^/]+\//, ""));

        const orig = await getBinary(originalUrl, path.join(RAW, rawRel(originalUrl, "orijinal")));
        if ("buf" in orig) {
          source = orig.buf; rec.kaynak_url = originalUrl; rec.kullanilan = "orijinal";
          rec.ham_dosya = path.posix.join("_ref/scraped", rawRel(originalUrl, "orijinal").replaceAll("\\", "/"));
        } else {
          const cached = await getBinary(cacheUrl, path.join(RAW, rawRel(cacheUrl, "cache")));
          if ("buf" in cached) {
            source = cached.buf; rec.kaynak_url = cacheUrl; rec.kullanilan = "cache";
            rec.ham_dosya = path.posix.join("_ref/scraped", rawRel(cacheUrl, "cache").replaceAll("\\", "/"));
            rec.not = `orijinal HTTP ${orig.status}`;
          } else {
            rec.not = `orijinal HTTP ${orig.status}, cache HTTP ${cached.status}`;
          }
        }
      } else rec.not = "sayfada görsel yok";

      if (source) {
        try {
          const m = await sharp(source).metadata();
          rec.kaynak_boyut = { w: m.width ?? 0, h: m.height ?? 0 };
          rec.cikti = await writeVariants(source, cat.slug, slug);
        } catch (e) {
          rec.kullanilan = "yer-tutucu"; rec.not = `bozuk görsel: ${(e as Error).message}`; source = null;
        }
      }
      if (!source) {
        const ph = await sharp(placeholderSvg(it.ad, 720, 900)).png().toBuffer();
        rec.kaynak_boyut = { w: 720, h: 900 };
        rec.cikti = await writeVariants(ph, cat.slug, slug);
      }
      records.push(rec);
      process.stdout.write(`  ${rec.kullanilan === "orijinal" ? "●" : rec.kullanilan === "cache" ? "○" : "×"} ${it.ad}\n`);
    }
  }
  return records;
}

// ─── 2. Şubeler ─────────────────────────────────────────────────────────────
type Branch = {
  /** Sitedeki görünen ad, aynen. */
  ad: string;
  /** Normalize tip: "Cafe" | "Cafe&Restaurant". Ham yazım tip_ham'da. */
  tip: "Cafe" | "Cafe&Restaurant" | null;
  tip_ham: string | null;
  adres: string | null;
  telefon: string | null;
  eposta: string | null;
  detay_url: string;
  kaynak: "liste" | "detay";
  /** Liste sayfası açıklamayı ~100 karakterde ".." ile kesiyor. true ise adres/telefon/e-posta eksik olabilir. */
  kesik: boolean;
  liste_sayfasi: number;
};

const TYPE = /^(cafe\s*(?:&|\s)\s*restaurant|cafe|restaurant)(?=\s|$)/i;
const PHONE = /(?:\+?90\s?)?0\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?!\d)/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const normType = (raw: string | null): Branch["tip"] => (!raw ? null : /restaurant/i.test(raw) ? "Cafe&Restaurant" : "Cafe");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** Liste açıklaması: "<ad> <tip> <adres> <telefon> <e-posta>" düz metni, sonu ".." ile kesik olabilir. */
function listFields(desc: string, name: string) {
  let s = squash(text(desc));
  if (s.startsWith(name)) s = s.slice(name.length).trim();
  const kesik = /\.\.$/.test(s);
  s = s.replace(/\.\.$/, "").trim();
  const t = s.match(TYPE);
  const tip_ham = t ? t[1] : null;
  if (t) s = s.slice(t[0].length).trim();
  const ph = s.match(PHONE), em = s.match(EMAIL);
  const cut = Math.min(ph?.index ?? Infinity, em?.index ?? Infinity);
  let adres = cut === Infinity ? s : s.slice(0, cut);
  // Kesik metnin sonundaki yarım telefon parçası adres değildir
  if (cut === Infinity && kesik) adres = adres.replace(/\s0[\d\s()]*$/, "");
  return {
    tip: normType(tip_ham), tip_ham,
    adres: squash(adres).replace(/[,–-]\s*$/, "") || null,
    telefon: ph ? squash(ph[0]) : null,
    eposta: em ? em[0] : null,
    kesik,
  };
}

function parseBranchList(html: string, page: number): Branch[] {
  const out: Branch[] = [];
  for (const block of html.split(/<div class="product-block">/).slice(1)) {
    const a = block.match(/<h6 class="name"><a href="([^"]+)">([\s\S]*?)<\/a><\/h6>/);
    if (!a) continue;
    const ad = squash(text(a[2]));
    const desc = block.match(/<p class="description">([\s\S]*?)<\/p>/)?.[1] ?? "";
    out.push({ ad, ...listFields(desc, ad), detay_url: decode(a[1]), kaynak: "liste", liste_sayfasi: page });
  }
  return out;
}

/** "X Şubesi" / "X Şube" farkını yok sayarak eşleştirir (sitede ikisi de geçiyor). */
const branchKey = (s: string) => squash(s).toLocaleLowerCase("tr").replace(/\s+şube(si)?$/, "");

async function scrapeBranches() {
  const all: Branch[] = [];
  for (const [i, url] of BRANCH_PAGES.entries()) {
    const html = await getHtml(url, `subeler-${i + 1}.html`);
    const list = parseBranchList(html, i + 1);
    console.log(`şube listesi sayfa ${i + 1}: ${list.length}`);
    all.push(...list);
  }
  // Tekrarları ele (aynı detay URL'i)
  const seen = new Set<string>();
  const unique = all.filter((b) => (seen.has(b.detay_url) ? false : (seen.add(b.detay_url), true)));

  const missing: string[] = [];
  const nameDiffs: { istenen: string; sitede: string }[] = [];
  for (const name of DEMO_BRANCHES) {
    const b = unique.find((x) => branchKey(x.ad) === branchKey(name));
    if (!b) { missing.push(name); continue; }
    if (b.ad !== name) nameDiffs.push({ istenen: name, sitede: b.ad });
    const slug = new URL(b.detay_url).pathname.split("/").pop()!;
    const html = await getHtml(b.detay_url, `sube-${slug}.html`);
    const detail = parseBranchDetail(html);
    if (detail) Object.assign(b, detail, { kaynak: "detay", kesik: false });
    else console.log(`  ! detay ayrıştırılamadı: ${b.detay_url}`);
  }
  return { branches: unique, missing, nameDiffs };
}

/** Şube detay sayfası: #tab-description içinde p.tip / p.adres / p.tel / p.posta. */
function parseBranchDetail(html: string): Partial<Branch> | null {
  const pane = html.match(/id="tab-description">([\s\S]*?)<div class="tab-pane"/)?.[1];
  if (!pane) return null;
  const field = (cls: string) => {
    const m = pane.match(new RegExp(`<p class="${cls}">([\\s\\S]*?)</p>`));
    return m ? squash(text(m[1])) || null : null;
  };
  const tip_ham = field("tip");
  const adres = field("adres");
  if (tip_ham || adres) return { tip: normType(tip_ham), tip_ham, adres, telefon: field("tel"), eposta: field("posta") };
  // Bazı şubelerde alanlar sınıfsız <p> olarak girilmiş: düz metin ayrıştırıcısına düş
  const { kesik: _, ...rest } = listFields(pane, "");
  return rest;
}

// ─── 3. Logo ────────────────────────────────────────────────────────────────
async function scrapeLogo() {
  const file = path.join(DEMO, "_ref/logo.png");
  const r = await getBinary(LOGO_URL, file);
  if ("status" in r) console.log(`logo: indirilemedi (HTTP ${r.status})`);
  else { const m = await sharp(r.buf).metadata(); console.log(`logo: ${m.width}×${m.height} ${m.format}${m.hasAlpha ? " (alfa)" : ""}${r.fetched ? " ↓" : ""}`); }
}

// ─── Çalıştır ───────────────────────────────────────────────────────────────
async function dirSize(dir: string): Promise<{ bytes: number; files: number }> {
  let bytes = 0, files = 0;
  if (!existsSync(dir)) return { bytes, files };
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) { bytes += (await stat(path.join(e.parentPath, e.name))).size; files++; }
  }
  return { bytes, files };
}

await mkdir(RAW, { recursive: true });
await loadRobots();
console.log(`robots.txt Disallow (User-agent: *): ${disallow!.length ? disallow!.join(" ") : "yok"}`);

const products = await scrapeProducts();
const { branches, missing, nameDiffs } = await scrapeBranches();
await scrapeLogo();

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const byCat = Object.fromEntries(CATEGORIES.map((c) => [c.slug, products.filter((p) => p.kategori === c.slug).length]));
const outs = products.flatMap((p) => p.cikti);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const summary = {
  tarih: new Date().toISOString(),
  kategori_basina_urun: byCat,
  toplam_urun: products.length,
  gorsel: {
    orijinal: products.filter((p) => p.kullanilan === "orijinal").length,
    cache: products.filter((p) => p.kullanilan === "cache").length,
    yer_tutucu: products.filter((p) => p.kullanilan === "yer-tutucu").length,
  },
  ortalama_bayt: {
    webp: Object.fromEntries(WIDTHS.map((w) => [w, Math.round(avg(outs.filter((o) => o.w === w).map((o) => o.webp_bytes)))])),
    avif: Object.fromEntries(WIDTHS.map((w) => [w, Math.round(avg(outs.filter((o) => o.w === w).map((o) => o.avif_bytes)))])),
  },
  butce_asan: outs.filter((o) => o.webp_bytes > BUDGET.webp || o.avif_bytes > BUDGET.avif).map((o) => o.webp),
  urunler_klasoru: await dirSize(OUT_IMG),
  ham_klasor: await dirSize(RAW),
  sube: { toplam: branches.length, detayli: branches.filter((b) => b.kaynak === "detay").length, bulunamayan_demo_subeleri: missing, ad_farki: nameDiffs },
  istek_sayisi_bu_calisma: requestCount,
};

await save(path.join(DATA, "urunler.json"), JSON.stringify({ kaynak: ORIGIN, ozet: summary, urunler: products }, null, 2) + "\n");
await save(path.join(DATA, "subeler-tam.json"), JSON.stringify({
  kaynak: `${ORIGIN}/tum-magazalar/yurtici-subeler?page=1..7`,
  cekilme_tarihi: summary.tarih,
  not: "Liste sayfası açıklamayı kesiyor (kesik: true). Tam adres/telefon/e-posta yalnızca kaynak: \"detay\" olan şubelerde.",
  toplam: branches.length,
  subeler: branches,
}, null, 2) + "\n");

console.log("\n── Özet ──");
console.log(JSON.stringify({ ...summary, urunler_klasoru: `${summary.urunler_klasoru.files} dosya, ${kb(summary.urunler_klasoru.bytes)}` }, null, 2));
