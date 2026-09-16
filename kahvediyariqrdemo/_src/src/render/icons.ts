/** Kategori placeholder ikonları — 24'lük ızgara, çizgi, currentColor. Dekoratif (aria-hidden). */
import type { CategoryIcon } from "../data/schema";
import { raw, type Raw } from "./html";

const wrap = (body: string, cls = "icon") =>
  raw(`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`);

const CATEGORY: Record<CategoryIcon, string> = {
  hot: '<path d="M5 10h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/><path d="M4 21h14"/>',
  iced: '<path d="M6 7h12l-1.6 13a1 1 0 0 1-1 .9H8.6a1 1 0 0 1-1-.9z"/><path d="M13 7l2.5-4.5H18"/><rect x="8.5" y="10.5" width="3" height="3" rx=".6"/><rect x="12" y="13.5" width="3" height="3" rx=".6"/>',
  tea: '<path d="M8 6h8c0 3-1.8 4-1.8 6.5S16 16 16 18.5c0 1.4-1.5 2.5-4 2.5s-4-1.1-4-2.5C8 16 9.8 15 9.8 12.5S8 9 8 6z"/><path d="M7 21h10"/><path d="M11 3.5c-.6.8.6 1.4 0 2.2"/>',
  cold: '<path d="M10 2.5h4v3l1.6 2.2a2 2 0 0 1 .4 1.2V20a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20V8.9a2 2 0 0 1 .4-1.2L10 5.5z"/><path d="M8 12h8M8 17h8"/>',
  pastry: '<path d="M3.5 17 12 5l8.5 12z"/><path d="M3.5 17v2.5h17V17"/><path d="M8 11.5h8"/><circle cx="12" cy="4.2" r="1"/>',
  snack: '<path d="M3 15 12 5l9 10"/><path d="M3 15h18v2.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M5.5 15c1.5-1 2.5 1 4 0s2.5 1 4 0 2.5 1 4 0"/>',
  beans: '<path d="M6 3h12l-1 3.5 1 1V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7.5l1-1z"/><path d="M7 6.5h10"/><ellipse cx="12" cy="14" rx="2.6" ry="3.6" transform="rotate(25 12 14)"/><path d="M10.7 11.3c1.6 1.2 1 4.2 2.6 5.4"/>',
};

export const categoryIcon = (icon: CategoryIcon, cls?: string): Raw => wrap(CATEGORY[icon], cls);

export const ui = {
  search: () => wrap('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
  close: () => wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
  chevron: () => wrap('<path d="m9 5 7 7-7 7"/>'),
  swap: () => wrap('<path d="M7 7h11l-3.5-3.5M17 17H6l3.5 3.5"/>'),
  pin: () => wrap('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  phone: () => wrap('<path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5L16 14l4 1.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  clock: () => wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
};
