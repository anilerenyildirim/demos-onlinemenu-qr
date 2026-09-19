/** Yayın yolu. Tüm link ve asset yolları buradan üretilir; kök "/" hiçbir yerde varsayılmaz. */
export const BASE = "/kahvederyasiqrdemo";
/** Açık Graph için mutlak adres gerekir (WhatsApp/form önizlemeleri). */
export const SITE = "https://demos.onlinemenu-qr.com";

import type { Locale } from "./data/schema";

const prefix = (l: Locale) => (l === "tr" ? BASE : `${BASE}/${l}`);

export const paths = {
  entry: (l: Locale) => `${prefix(l)}/`,
  branch: (l: Locale, slug: string) => `${prefix(l)}/sube/${slug}`,
  asset: (file: string) => `${BASE}/assets/${file}`,
  /** Ürün görselleri scripts/scrape-assets.ts tarafından üretilir; build bu klasöre dokunmaz. */
  product: (file: string) => `${BASE}/${file}`,
};
