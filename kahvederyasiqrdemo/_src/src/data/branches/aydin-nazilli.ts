/** Aydın Nazilli Bamboo AVM — ad/tip/adres/telefon gerçek (siteden). Aşağıdaki her şey örnek. */
import { defineBranch, everyDay } from "./define";

export const bundle = defineBranch({
  slug: "aydin-nazilli-bamboo-avm",
  siteSlug: "aydin-nazilli-bamboo-avm-subesi",
  city: { tr: "Aydın · Nazilli", en: "Aydın · Nazilli", ar: "آيدين · نازيلي" },
  price_adjust_pct: 0, // TEYİT: örnek — merkez fiyatı
  hours: everyDay("10:00", "22:00"), // TEYİT: örnek — AVM saatleri varsayıldı
  overrides: {
    // TEYİT: örnek — AVM şubesinde demleme barı yok varsayıldı
    "syphon": { availability: "hidden" },
    "chemex": { availability: "hidden" },
    "franbuazli-cheesecake": { availability: "sold_out" }, // TEYİT: stok örnek
    "cafe-latte": { delta_tl: 10 }, // TEYİT: örnek — ürün bazlı sabit şube farkı
  },
});
