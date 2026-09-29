/**
 * Satır içi SVG ikonlar — 24'lük ızgara, çizgi, currentColor. Dekoratiftir (aria-hidden); anlam her zaman
 * yanındaki metinde. Yön bildiren ikonlar (.icon--dir) RTL'de CSS ile aynalanır.
 */
import type { AllergenCode, CategoryIcon } from "../data/schema";
import { raw, type Raw } from "./html";

const svg = (body: string, cls = "", size = 20) =>
  raw(`<svg class="icon${cls ? " " + cls : ""}" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);

export const icons = {
  chevronDown: () => svg(`<path d="m6 9 6 6 6-6"/>`),
  /** Okuma yönünü izleyen ok — RTL'de aynalanır */
  arrow: () => svg(`<path d="M5 12h14M13 6l6 6-6 6"/>`, "icon--dir"),
  arrowBack: () => svg(`<path d="M19 12H5M11 6l-6 6 6 6"/>`, "icon--dir"),
  arrowDown: () => svg(`<path d="M12 5v14M6 13l6 6 6-6"/>`),
  external: () => svg(`<path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/>`, "icon--dir"),
  pin: () => svg(`<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>`),
  phone: () => svg(`<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>`),
  mail: () => svg(`<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>`),
  clock: () => svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  close: () => svg(`<path d="M6 6l12 12M18 6 6 18"/>`),
  check: () => svg(`<path d="m5 12 4.5 4.5L19 7"/>`),
  copy: () => svg(`<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`),
  globe: () => svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`),
  menu: () => svg(`<path d="M4 7h16M4 12h16M4 17h16"/>`),
  layers: () => svg(`<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>`),
  lock: () => svg(`<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>`),
  unlock: () => svg(`<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.8-1.2"/>`),
  store: () => svg(`<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M10 20v-5h4v5"/>`),
  qr: () => svg(`<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>`),
  tag: () => svg(`<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>`),
  bolt: () => svg(`<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>`),
  palette: () => svg(`<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>`),
  copyPlus: () => svg(`<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M14 11v6M11 14h6M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`),
  form: () => svg(`<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/>`),
  map: () => svg(`<path d="m9 4-6 2.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>`),
  translate: () => svg(`<path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5 7M11 5c-.8 3.5-3.2 6.6-6.5 8.5"/><path d="m13 21 4-9 4 9M14.3 18h5.4"/>`),
  sparkle: () => svg(`<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>`),
  eye: () => svg(`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>`),
  play: () => svg(`<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>`),
  pause: () => svg(`<path d="M8 5v14M16 5v14"/>`),
  whatsapp: () => raw(`<svg class="icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s.9 2.6 1.1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.6-.3Z"/></svg>`),
};

/** Kategori ikonları — ürün görseli yoksa yer tutucu ve kategori sekmesi. */
const CATEGORY: Record<CategoryIcon, string> = {
  espresso: `<path d="M5 9h11v3.5A5.5 5.5 0 0 1 10.5 18h0A5.5 5.5 0 0 1 5 12.5V9Z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M3.5 20.5h15"/><path d="M8.5 3.5c-.7.9.7 1.8 0 2.7M12 3.5c-.7.9.7 1.8 0 2.7"/>`,
  filter: `<path d="M5 5h14l-4.5 7.5h-5L5 5Z"/><path d="M10 12.5v2M14 12.5v2"/><path d="M8 15h8v4.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5V15Z"/><path d="M4 5h16"/>`,
  cezve: `<path d="M8 8.5h8l-1 10.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 19L8 8.5Z"/><path d="M7.5 8.5 7 6.5h10l-.5 2"/><path d="M16 11h4.5"/><path d="M11 3.5c-.6.8.6 1.5 0 2.3"/>`,
  iced: `<path d="M6.5 8h11l-1.3 12a1.5 1.5 0 0 1-1.5 1.3H9.3A1.5 1.5 0 0 1 7.8 20L6.5 8Z"/><path d="M5.5 8h13"/><path d="M13 8l1.5-5.5h2.5"/><rect x="9" y="11" width="2.6" height="2.6" rx=".6"/><rect x="12.2" y="13.8" width="2.6" height="2.6" rx=".6"/>`,
  frappe: `<path d="M7 10.5h10l-1.2 9.5a1.5 1.5 0 0 1-1.5 1.3H9.7a1.5 1.5 0 0 1-1.5-1.3L7 10.5Z"/><path d="M6 10.5h12"/><path d="M7.5 10.5a4.5 4.5 0 0 1 9 0"/><path d="M12 6V2.5h2"/><path d="M8.5 15h7"/>`,
  tea: `<path d="M8 5h8c0 3-2 4-2 6.5s2 3.5 2 6c0 1.6-1.8 3-4 3s-4-1.4-4-3c0-2.5 2-3.5 2-6S8 8 8 5Z"/><path d="M6.5 21h11"/><path d="M8.3 14h7.4"/>`,
  cake: `<path d="M3.5 17 17 7.5l3.5 9.5H3.5Z"/><path d="M3.5 17v3h17v-3"/><path d="M8 13.8h9.5"/><circle cx="17.5" cy="5" r="1.3"/>`,
  snack: `<path d="M4 15.5c0-4.5 3.6-8 8-8s8 3.5 8 8"/><path d="M4 15.5c1.4 1.3 2.7 1.3 4 0 1.3 1.3 2.7 1.3 4 0 1.3 1.3 2.7 1.3 4 0 1.3 1.3 2.7 1.3 4 0"/><path d="M9 8.5 10.5 12M15 8.5 13.5 12M12 7.5V11"/><path d="M5.5 18.5h13"/>`,
};
export const categoryIcon = (icon: CategoryIcon, cls = "", size = 20): Raw => svg(CATEGORY[icon], cls, size);

/** Alerjen ikonları — kullanılanlar çizili, diğerleri nokta. Anlam her zaman metin etiketinde. */
const ALLERGEN: Partial<Record<AllergenCode, string>> = {
  milk: `<path d="M9 3h6v3l2 3.5V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9.5L9 6V3Z"/><path d="M7 12.5c2 1 4 1 5 0s3-1 5 0"/>`,
  gluten: `<path d="M12 21V8"/><path d="M12 12c-2.5 0-4-1.7-4-4 2.5 0 4 1.7 4 4ZM12 12c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4Z"/><path d="M12 16.5c-2.5 0-4-1.7-4-4 2.5 0 4 1.7 4 4ZM12 16.5c2.5 0 4-1.7 4-4-2.5 0-4 1.7-4 4Z"/><path d="M12 8c-1.3-1-1.3-3.2 0-5 1.3 1.8 1.3 4 0 5Z"/>`,
  eggs: `<path d="M12 3c3.3 0 6 5 6 9.5A6 6 0 0 1 6 12.5C6 8 8.7 3 12 3Z"/>`,
  nuts: `<path d="M12 5c4 0 7 2.7 7 6.5S16 20 12 20 5 15.3 5 11.5 8 5 12 5Z"/><path d="M12 5c-1.5-1.3-3.4-1.8-5-1.2M12 8v9"/>`,
  soy: `<path d="M6 18c-1.8-1.8-1.8-4.7 0-6.5L11.5 6a4.6 4.6 0 0 1 6.5 6.5L12.5 18c-1.8 1.8-4.7 1.8-6.5 0Z"/><circle cx="9.3" cy="14.7" r="1.4"/><circle cx="14.7" cy="9.3" r="1.4"/>`,
  mustard: `<path d="M10 3h4v3l1.5 2v11.5a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5V8L10 6V3Z"/><path d="M8.5 12h7"/>`,
};
export const allergenIcon = (code: AllergenCode): Raw =>
  svg(ALLERGEN[code] ?? `<circle cx="12" cy="12" r="4"/>`, "icon--allergen", 16);

/**
 * onlinemenu-qr işareti — markanın kendi Glyph bileşeninden (onlinemenu-qr.com/src/components/Glyph.astro):
 * yuvarlatılmış çerçeve içinde QR'ın üç konum karesi, dördüncü köşede "canlı" nokta.
 */
export function omqrGlyph(size = 26, accent = "#CFE38A"): Raw {
  const rr = (x: number, y: number, w: number, h: number, r: number) =>
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const d = [rr(2, 2, 36, 36, 11), rr(9.5, 9.5, 8, 8, 2.4), rr(22.5, 9.5, 8, 8, 2.4), rr(9.5, 22.5, 8, 8, 2.4)];
  return raw(`<svg class="omqr-glyph" viewBox="0 0 40 40" width="${size}" height="${size}" fill="none" aria-hidden="true" focusable="false">${d.map((p) => `<path d="${p}" stroke="currentColor" stroke-width="2.2"/>`).join("")}<circle cx="26.5" cy="26.5" r="3.4" fill="${accent}"/></svg>`);
}
