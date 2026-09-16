/** Yayın yolu. Tüm link ve asset yolları buradan üretilir; kök "/" hiçbir yerde varsayılmaz. */
export const BASE = "/kahvediyariqrdemo";
/** Açık Graph için mutlak adres gerekir (WhatsApp/form önizlemeleri). */
export const SITE = "https://demos.onlinemenu-qr.com";

import type { Locale } from "./data/schema";

export const paths = {
  entry: (l: Locale) => (l === "tr" ? `${BASE}/` : `${BASE}/en/`),
  branch: (l: Locale, slug: string) => (l === "tr" ? `${BASE}/sube/${slug}` : `${BASE}/en/sube/${slug}`),
  asset: (file: string) => `${BASE}/assets/${file}`,
};
