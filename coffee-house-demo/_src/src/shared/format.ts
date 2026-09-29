/**
 * Dil ve para birimi bağımlı biçimlendirme — build (sayfa üretimi) ve istemci (şube değişimi) AYNI fonksiyonu kullanır.
 *
 * Fiyat Intl ile değil elle biçimlenir: tarayıcıların CLDR sürümleri farklı (ör. KGS için yeni som işareti ⃀
 * çoğu fontta yok; bazı motorlar "KGS", bazıları "⃀" basar). Deterministik çıktı = build ile istemci birebir aynı.
 */
import type { Locale } from "../config";
import type { Currency } from "../data/schema";

/** [önek, sonek] — Arapçada rakamlar Latin tutulur (brief: rakamlar ve telefonlar LTR). // TEYİT: markanın tercihi */
const AFFIX: Record<Currency, Record<Locale, [string, string]>> = {
  TRY: { tr: ["₺", ""], en: ["₺", ""], ar: ["", " ₺"], ru: ["", " ₺"] },
  AED: { tr: ["AED ", ""], en: ["AED ", ""], ar: ["", " د.إ"], ru: ["", " AED"] },
  KGS: { tr: ["KGS ", ""], en: ["KGS ", ""], ar: ["", " KGS"], ru: ["", " сом"] },
};
const GROUP: Record<Locale, string> = { tr: ".", en: ",", ar: ",", ru: " " };
const DECIMAL: Record<Locale, string> = { tr: ",", en: ".", ar: ".", ru: "," };

export function formatNumber(value: number, locale: Locale, fraction = 0): string {
  const [int, frac] = value.toFixed(fraction).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP[locale]);
  return frac ? `${grouped}${DECIMAL[locale]}${frac}` : grouped;
}

/** 12500 kuruş → "₺125" · 1850 fils → "AED 18,50" (tr) · 22000 tyiyn → "220 сом" (ru) */
export function formatPrice(minor: number, currency: Currency, locale: Locale): string {
  const major = minor / 100;
  const text = formatNumber(major, locale, Number.isInteger(major) ? 0 : 2);
  const [pre, post] = AFFIX[currency][locale];
  return pre + text + post;
}

/** ISO hafta günü (1 = Pazartesi) → yerel gün adı. */
export function weekdayName(weekday: number, locale: Locale, style: "long" | "short" = "long"): string {
  const d = new Date(Date.UTC(2024, 0, weekday)); // 2024-01-01 pazartesi
  return new Intl.DateTimeFormat(INTL_TAG[locale], { weekday: style, timeZone: "UTC" }).format(d);
}

export const INTL_TAG: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", ar: "ar-u-nu-latn", ru: "ru-RU" };

/** "0 533 425 71 59" → "tel:+905334257159" */
export const telHref = (phone: string) => `tel:+90${phone.replace(/\D/g, "").replace(/^0/, "")}`;

/** Görünen telefon — uluslararası biçim (yurt dışı ziyaretçi için): "+90 533 425 71 59" */
export const phoneIntl = (phone: string) => `+90 ${phone.replace(/^0\s*/, "")}`;
