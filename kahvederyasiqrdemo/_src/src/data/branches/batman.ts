/** Batman — ad/tip/adres/telefon gerçek (siteden). Aşağıdaki her şey örnek. */
import { defineBranch, everyDay } from "./define";

export const bundle = defineBranch({
  slug: "batman",
  siteSlug: "batman-subesi",
  city: { tr: "Batman · Merkez", en: "Batman · Centre", ar: "باتمان · المركز" },
  price_adjust_pct: -5, // TEYİT: örnek — bölge fiyat katmanı −%5
  hours: everyDay("07:00", "00:00"), // TEYİT: örnek — otel içi şube, erken kahvaltı varsayıldı
  overrides: {
    "menengic-kahvesi": { delta_tl: -10 }, // TEYİT: örnek — yöresel ürüne şube indirimi
    "leb-i-derya-kahvalti": { availability: "sold_out" }, // TEYİT: stok örnek
  },
});
