/**
 * Anasayfa harita önizlemesi: statik SVG (Leaflet yok, JS yok). Natural Earth 1:110m + şube noktaları,
 * Web Mercator. Gece bloğunda durur — kara koyu, ağın ülkeleri bir ton açık, noktalar logo mavisi / neon (yakında).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { locations } from "../../src/data/network";
import { SRC } from "./out";

const BOX = { lon0: 22, lon1: 80, lat0: 19.5, lat1: 47.5 };
const W = 1200;
const merc = (lat: number) => (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const H = Math.round((W * (merc(BOX.lat1) - merc(BOX.lat0))) / (BOX.lon1 - BOX.lon0));
const X = (lon: number) => ((lon - BOX.lon0) / (BOX.lon1 - BOX.lon0)) * W;
const Y = (lat: number) => H - ((merc(lat) - merc(BOX.lat0)) / (merc(BOX.lat1) - merc(BOX.lat0))) * H;
/** Ağın ülkeleri (ISO 3166-1 sayısal): Türkiye, BAE, Kırgızistan */
const NETWORK = new Set(["792", "784", "417"]);

export async function mapPreviewSvg(): Promise<{ svg: string; width: number; height: number }> {
  const geo = JSON.parse(await readFile(path.join(SRC, "data/geo/bolge-110m.json"), "utf8")) as { features: { id: string; geometry: { coordinates: [number, number][][][] } }[] };
  const d = (f: (typeof geo.features)[number]) => f.geometry.coordinates
    .map((poly) => poly.map((ring) => "M" + ring.map(([lon, lat]) => `${X(lon).toFixed(1)} ${Y(lat).toFixed(1)}`).join("L") + "Z").join(""))
    .join("");
  const land = geo.features.filter((f) => !NETWORK.has(f.id)).map(d).join("");
  const net = geo.features.filter((f) => NETWORK.has(f.id)).map(d).join("");
  const pins = [...locations].sort((a, b) => (a.status === b.status ? 0 : a.status === "acik" ? 1 : -1)).map((l) => {
    const [lat, lon] = l.latlng;
    return l.status === "acik"
      ? `<circle cx="${X(lon).toFixed(1)}" cy="${Y(lat).toFixed(1)}" r="7" fill="#4A8CC8" stroke="#05080C" stroke-width="2.5"/>`
      : `<circle cx="${X(lon).toFixed(1)}" cy="${Y(lat).toFixed(1)}" r="6.5" fill="#05080C" stroke="#F37411" stroke-width="3"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<path d="${land}" fill="#131B24" stroke="#26313C" stroke-width="1" fill-rule="evenodd"/>` +
    `<path d="${net}" fill="#22303E" stroke="#3A4957" stroke-width="1.2" fill-rule="evenodd"/>` +
    pins + `</svg>\n`;
  return { svg, width: W, height: H };
}
