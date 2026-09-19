/** Satır içi SVG ikonlar (24×24, currentColor). Dekoratiftir: aria-hidden; anlam her zaman yanındaki metinde. */
import { raw, type Raw } from "./html";

const svg = (body: string, cls = "") =>
  raw(`<svg class="icon${cls ? " " + cls : ""}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`);

export const icons = {
  chevronDown: () => svg(`<path d="m6 9 6 6 6-6"/>`),
  /** Okuma yönünü izleyen ok — RTL'de CSS ile aynalanır. */
  arrow: () => svg(`<path d="M5 12h14M13 6l6 6-6 6"/>`, "icon--dir"),
  pin: () => svg(`<path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>`),
  phone: () => svg(`<path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>`),
  clock: () => svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`),
  close: () => svg(`<path d="M6 6l12 12M18 6 6 18"/>`),
  check: () => svg(`<path d="m5 12 4.5 4.5L19 7"/>`),
  layers: () => svg(`<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>`),
  store: () => svg(`<path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M10 20v-5h4v5"/>`),
  globe: () => svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>`),
  qr: () => svg(`<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>`),
};

/** Fleur-de-lis: cephedeki altın motif. Yalnızca bölüm ayraçlarında çok hafif doku olarak. */
export const fleur = (): Raw =>
  raw(`<svg class="fleur" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 1.2C9.7 4.2 9.5 8 11 11.6h2c1.5-3.6 1.3-7.4-1-10.4ZM10.4 12.2C9.2 9.3 6.6 7.8 4.6 8.9 2.7 10 2.8 12.9 4.9 13.6c-.5-.9-.3-2.1.7-2.6 1.5-.7 3.1.5 3.7 1.9ZM13.6 12.2c1.2-2.9 3.8-4.4 5.8-3.3 1.9 1.1 1.8 4-.3 4.7.5-.9.3-2.1-.7-2.6-1.5-.7-3.1.5-3.7 1.9ZM7.4 12.4h9.2a.9.9 0 0 1 0 1.8H7.4a.9.9 0 0 1 0-1.8ZM11 14.8h2l.6 5.2c-.7-.3-1.3-.1-1.6.6-.3-.7-.9-.9-1.6-.6ZM10.3 14.8c-1.7 1.3-2.8 3.1-2.2 5 .5-1.2 1.5-2.1 2.6-2.5ZM13.7 14.8c1.7 1.3 2.8 3.1 2.2 5-.5-1.2-1.5-2.1-2.6-2.5Z"/></svg>`);
