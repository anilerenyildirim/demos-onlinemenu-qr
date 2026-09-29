/** Yayın yolu. Tüm link ve asset yolları buradan üretilir; kök "/" hiçbir yerde varsayılmaz. */
export const BASE = "/coffee-house-demo";
/** Açık Graph / hreflang için mutlak adres gerekir (WhatsApp/e-posta önizlemeleri). */
export const SITE = "https://demos.onlinemenu-qr.com";

export const LOCALES = ["tr", "en", "ar", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

/** Teklif talebi adresi (sunum kapanışı) — brief §4.7 */
export const OFFER_EMAIL = "cabukrandevu@gmail.com";
export const OFFER_SUBJECT = "Coffee House – Teklif Talebi";

/**
 * Kurumsal site sayfaları. AR/RU'da yalnızca home/franchising/branches/contact çevrilir (brief §5 dil kapsamı);
 * diğerleri o dillerde EN sürümüne bağlanır.
 */
export const SITE_PAGES = {
  home: { tr: "", en: "", ar: "", ru: "" },
  franchising: { tr: "franchising", en: "franchising", ar: "franchising", ru: "franchising" },
  branches: { tr: "subeler", en: "branches", ar: "branches", ru: "branches" },
  brands: { tr: "markalarimiz", en: "our-brands" },
  references: { tr: "referanslar", en: "references" },
  about: { tr: "hakkimizda", en: "about" },
  contact: { tr: "iletisim", en: "contact", ar: "contact", ru: "contact" },
  privacy: { tr: "kvkk", en: "privacy-notice" },
  cookies: { tr: "cerez-politikasi", en: "cookie-policy" },
} as const satisfies Record<string, Partial<Record<Locale, string>>>;
export type SitePage = keyof typeof SITE_PAGES;

/** Sayfanın o dilde sürümü var mı? */
export const hasPage = (page: SitePage, l: Locale): boolean => l in SITE_PAGES[page];

const sitePrefix = (l: Locale) => (l === "tr" ? `${BASE}/site` : `${BASE}/site/${l}`);

export const paths = {
  brief: (hash = "") => `${BASE}/${hash}`,
  menuIndex: () => `${BASE}/menu/`,
  /** Şubenin varsayılan dili klasör adresidir (QR bu adrese basılır); diğer diller /<dil>. */
  menu: (slug: string, l: Locale, defaultLocale: Locale) =>
    l === defaultLocale ? `${BASE}/menu/${slug}/` : `${BASE}/menu/${slug}/${l}`,
  /** Sayfa o dilde yoksa EN sürümü döner (nav ve dil seçici bunu işaretler). */
  site: (page: SitePage, l: Locale): string => {
    const lang = hasPage(page, l) ? l : "en";
    const slug = (SITE_PAGES[page] as Partial<Record<Locale, string>>)[lang]!;
    return slug ? `${sitePrefix(lang)}/${slug}` : `${sitePrefix(lang)}/`;
  },
  asset: (file: string) => `${BASE}/assets/${file}`,
  /** npm run video çıktısı — build dokunmaz */
  video: (file: string) => `${BASE}/video/${file}`,
};
