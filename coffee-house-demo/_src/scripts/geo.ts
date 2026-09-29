/**
 * TEK SEFERLİK: Natural Earth (public domain, world-atlas paketi) → sitenin kendi barındırdığı taban harita verisi.
 *
 * Neden karo (OSM) değil: ortak _headers CSP'si img-src 'self' data: — dış karo yüklenemez; repo konvansiyonu
 * _headers'a dokunmamak. Şubelerin bugün yalnızca şehir düzeyinde konumu var; ülke/kıyı çizgisi yeterli.
 * Şube adresleri geldiğinde OSM katmanı tek satırla eklenebilir (src/client/map.ts → TILE_URL) ve _headers'a
 * tile.openstreetmap.org izni verilir.
 *
 *   data/geo/bolge-50m.json    Türkiye–Körfez–Orta Asya, ülke poligonları (Leaflet, şubeler sayfası)
 *   data/geo/bolge-110m.json   aynı bölge, kaba — anasayfa statik SVG önizlemesi
 *   data/geo/marmara-10m.json  İstanbul çevresi, ayrıntılı kıyı — iletişim haritası
 * Koordinatlar [boylam, enlem]; yuvarlama: 50m/110m → 2 hane (~1 km), 10m → 3 hane (~100 m).
 * Çalıştırma: npm run geo
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feature } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";
import type { Topology, GeometryCollection } from "topojson-specification";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const atlas = (f: string) => path.join(path.dirname(require.resolve("world-atlas/package.json")), f);

type Ring = [number, number][];
type Poly = Ring[];
interface Feat { type: "Feature"; id: string; properties: { name: string }; geometry: { type: "MultiPolygon"; coordinates: Poly[] } }

/** Bölge: batıda Balkanlar, doğuda Kırgızistan, güneyde BAE. [minLon, minLat, maxLon, maxLat]. 50m verisinin noktalarının %10'u tutulur (~54 KB). */
const REGION: [number, number, number, number] = [18, 20, 80, 48];
const MARMARA: [number, number, number, number] = [27.2, 40.25, 30.2, 41.55];

/** Şube olan ülkeler tam ayrıntıda (ISO 3166-1 sayısal): Türkiye 792, BAE 784, Kırgızistan 417 — filtrede bu ülkelere yakınlaşılır. */
const DETAILED = new Set(["792", "784", "417"]);

async function load(file: string, keepQuantile: number) {
  let topo = JSON.parse(await readFile(atlas(file), "utf8")) as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  if (keepQuantile > 0) {
    topo = presimplify(topo) as typeof topo;
    // Şube ülkelerinin yayları (komşularla paylaşılanlar dahil) sadeleştirilmez: ağırlık = ∞.
    // Yaylar paylaşıldığı için komşu sınırında boşluk/bindirme oluşmaz.
    const arcIndex = (i: number) => (i < 0 ? ~i : i);
    const collect = (arcs: unknown): number[] => (Array.isArray(arcs) ? arcs.flatMap((a) => (typeof a === "number" ? [arcIndex(a)] : collect(a))) : []);
    for (const g of topo.objects.countries.geometries) {
      if (!DETAILED.has(String(g.id))) continue;
      for (const i of collect((g as unknown as { arcs: unknown }).arcs)) for (const p of topo.arcs[i]) (p as number[])[2] = Infinity;
    }
    topo = simplify(topo, quantile(topo, keepQuantile)) as typeof topo;
  }
  const fc = feature(topo, topo.objects.countries) as unknown as { features: { id: string; properties: { name: string }; geometry: { type: string; coordinates: unknown } | null }[] };
  return fc.features
    .filter((f) => f.geometry)
    .map((f): Feat => ({
      type: "Feature", id: String(f.id), properties: { name: f.properties.name },
      geometry: { type: "MultiPolygon", coordinates: (f.geometry!.type === "Polygon" ? [f.geometry!.coordinates] : f.geometry!.coordinates) as Poly[] },
    }));
}

const bboxOf = (f: Feat) => {
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a, b, c, d];
};
const intersects = (f: Feat, r: number[]) => { const [a, b, c, d] = bboxOf(f); return a <= r[2] && c >= r[0] && b <= r[3] && d >= r[1]; };

/** Sutherland–Hodgman: halkayı dikdörtgene kırp (dolgu çizimi için yeterli; kırpma kenarları kıyı sayılmaz). */
function clipRing(ring: Ring, [x0, y0, x1, y1]: number[]): Ring {
  const edges: [(p: [number, number]) => boolean, (a: [number, number], b: [number, number]) => [number, number]][] = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    }
    if (out.length === 0) break;
  }
  return out;
}

function finish(features: Feat[], digits: number, clip?: number[]) {
  const r = (v: number) => Math.round(v * 10 ** digits) / 10 ** digits;
  const out: Feat[] = [];
  for (const f of features) {
    const polys: Poly[] = [];
    for (const poly of f.geometry.coordinates) {
      const rings: Poly = [];
      for (const ring of poly) {
        let pts = clip ? clipRing(ring, clip) : ring;
        pts = pts.map(([x, y]) => [r(x), r(y)] as [number, number]).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
        if (pts.length >= 4) rings.push(pts);
        else if (rings.length === 0) break; // dış halka düştüyse poligon tümden düşer
      }
      if (rings.length) polys.push(rings);
    }
    if (polys.length) out.push({ ...f, geometry: { type: "MultiPolygon", coordinates: polys } });
  }
  return { type: "FeatureCollection", features: out };
}

async function write(name: string, fc: ReturnType<typeof finish>) {
  const json = JSON.stringify(fc);
  await writeFile(path.join(SRC, "data/geo", name), json + "\n");
  console.log(`${name.padEnd(20)} ${fc.features.length} ülke, ${(json.length / 1024).toFixed(1)} KB`);
}

await write("bolge-50m.json", finish((await load("countries-50m.json", 0.1)).filter((f) => intersects(f, REGION)), 2));
await write("bolge-110m.json", finish((await load("countries-110m.json", 0)).filter((f) => intersects(f, REGION)), 2));
await write("marmara-10m.json", finish((await load("countries-10m.json", 0)).filter((f) => intersects(f, MARMARA)), 3, MARMARA));
