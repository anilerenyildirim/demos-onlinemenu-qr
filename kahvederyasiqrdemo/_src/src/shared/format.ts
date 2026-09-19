/** Dil bağımlı biçimlendirme — build (sayfa üretimi) ve istemci (şube değişimi) aynı fonksiyonu kullanır. */
import type { Locale } from "../data/schema";

/** Arapçada rakamlar Latin tutulur: fiyat ve saatler üç dilde aynı okunur. // TEYİT: markanın tercihi sorulmalı */
export const INTL_TAG: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", ar: "ar-u-nu-latn" };

const priceFmt = new Map<Locale, Intl.NumberFormat>();
export function formatPrice(minor: number, locale: Locale): string {
  let f = priceFmt.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(INTL_TAG[locale], {
      style: "currency", currency: "TRY", currencyDisplay: "narrowSymbol", minimumFractionDigits: 0, maximumFractionDigits: 2,
    });
    priceFmt.set(locale, f);
  }
  return f.format(minor / 100);
}

/** ISO hafta günü (1 = Pazartesi) → yerel gün adı. */
export function weekdayName(weekday: number, locale: Locale, style: "long" | "short" = "long"): string {
  // 2024-01-01 bir pazartesidir
  const d = new Date(Date.UTC(2024, 0, weekday));
  return new Intl.DateTimeFormat(INTL_TAG[locale], { weekday: style, timeZone: "UTC" }).format(d);
}

/** "0 530 390 80 30" / "0544 447 02 46" → "+905303908030" */
export const telHref = (phone: string) => `tel:+90${phone.replace(/\D/g, "").replace(/^0/, "")}`;
