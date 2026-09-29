/**
 * Şube haritası — Leaflet + kendi barındırdığımız Natural Earth taban haritası (dış karo yok: ortak _headers CSP'si
 * img-src 'self' data:). Şubelerin bugün yalnızca şehir düzeyinde konumu var; ülke/kıyı çizgisi bu ölçeğe yeter.
 *
 * Şube adresleri geldiğinde OSM karo katmanı açılabilir: TILE_URL'i doldurun ve _headers'a
 * img-src https://tile.openstreetmap.org iznini ekleyin (demo sayfası için ayrı kural).
 */
import L from "leaflet";

const TILE_URL: string | null = null;

export interface MapPoint {
  id: string; lat: number; lng: number; name: string; city: string; brand: string; brandName: string;
  open: boolean; menu: string | null; directions: string;
}
export interface MapData {
  mode: "region" | "office";
  points: MapPoint[];
  labels: { open: string; coming: string; menu: string; directions: string };
}
export interface MapApi { focus(id: string): void; filter(ids: Set<string>): void }

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const COLORS = { "coffee-house": "#2B6AA6", "coffee-art": "#462619", coming: "#F37411" } as const;
const TURKIYE = "792"; // ISO 3166-1 sayısal

export async function initMap(el: HTMLElement, data: MapData): Promise<MapApi> {
  const geo = await fetch(el.dataset.geo!).then((r) => r.json());
  const office = data.mode === "office";
  const map = L.map(el, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false, // sayfa kaydırması haritaya takılmasın
    zoomSnap: 0.25,
    minZoom: office ? 8 : 2.75,
    maxZoom: office ? 13 : 9,
  });
  // Vektör katmanlar eklenmeden ÖNCE bir görünüm olmalı: aksi halde SVG çizicinin sınırları tanımsız kalır
  // (Leaflet: "Cannot read properties of undefined (reading 'min')"). Asıl kadraj aşağıda fit() ile.
  map.setView([data.points[0].lat, data.points[0].lng], office ? 11 : 5);
  L.control.zoom({ position: "topright", zoomInTitle: el.dataset.zoomIn, zoomOutTitle: el.dataset.zoomOut }).addTo(map);
  map.attributionControl.setPrefix(false).addAttribution(esc(el.dataset.attribution ?? ""));

  if (TILE_URL) L.tileLayer(TILE_URL, { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
  else {
    L.geoJSON(geo, {
      interactive: false,
      style: (f) => ({ color: "#CFC6B8", weight: 1, fillColor: String(f?.id) === TURKIYE ? "#FFFFFF" : "#F1ECE4", fillOpacity: 1 }),
    }).addTo(map);
  }

  const markers = new Map<string, L.CircleMarker>();
  for (const p of data.points) {
    const color = p.open ? COLORS[p.brand as keyof typeof COLORS] ?? COLORS["coffee-house"] : COLORS.coming;
    const m = L.circleMarker([p.lat, p.lng], {
      radius: office ? 10 : 7, weight: p.open ? 2.5 : 3, color: p.open ? "#FFFFFF" : color,
      fillColor: color, fillOpacity: p.open ? 1 : 0.15,
    });
    const links = [
      p.menu ? `<a class="pop__btn pop__btn--menu" href="${esc(p.menu)}">${esc(data.labels.menu)}</a>` : "",
      `<a class="pop__btn" href="${esc(p.directions)}" target="_blank" rel="noopener">${esc(data.labels.directions)}</a>`,
    ].join("");
    m.bindPopup(`<div class="pop"><b>${esc(p.name)}</b><span>${esc(p.city)}</span><span class="pop__meta">${esc(p.brandName)} · ${esc(p.open ? data.labels.open : data.labels.coming)}</span><span class="pop__links">${links}</span></div>`, { closeButton: true, autoPanPadding: [24, 24] });
    m.bindTooltip(esc(p.name), { direction: "top", offset: [0, -8] });
    m.addTo(map);
    markers.set(p.id, m);
  }

  const fit = (ids?: Set<string>) => {
    const pts = data.points.filter((p) => !ids || ids.has(p.id));
    if (!pts.length) return;
    if (pts.length === 1) { map.setView([pts[0].lat, pts[0].lng], office ? 11 : 6); return; }
    map.fitBounds(L.latLngBounds(pts.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 7 });
  };
  fit();
  if (office) markers.get(data.points[0].id)?.openPopup();

  return {
    focus(id) {
      const m = markers.get(id);
      if (!m) return;
      map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 7), { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.8 });
      m.openPopup();
    },
    filter(ids) {
      for (const [id, m] of markers) {
        if (ids.has(id)) m.addTo(map); else m.remove();
      }
      fit(ids);
    },
  };
}
