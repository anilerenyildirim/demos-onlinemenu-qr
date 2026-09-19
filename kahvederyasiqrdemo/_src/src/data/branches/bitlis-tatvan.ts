/** Bitlis Tatvan — ad/tip/adres/telefon gerçek (siteden). Aşağıdaki her şey örnek. */
import { days, defineBranch } from "./define";

export const bundle = defineBranch({
  slug: "bitlis-tatvan",
  siteSlug: "bitlis-tatvan-subesi",
  city: { tr: "Bitlis · Tatvan", en: "Bitlis · Tatvan", ar: "بتليس · تاتفان" },
  price_adjust_pct: -5, // TEYİT: örnek — bölge fiyat katmanı −%5
  // TEYİT: çalışma saatleri örnek
  hours: [...days([1, 2, 3, 4, 5, 6], "09:00", "23:00"), ...days([7], "10:00", "22:00")],
  overrides: {
    "tiramisu": { availability: "sold_out" }, // TEYİT: stok örnek
  },
});
