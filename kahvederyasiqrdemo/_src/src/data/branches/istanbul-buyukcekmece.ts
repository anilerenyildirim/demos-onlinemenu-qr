/** İstanbul Büyükçekmece — ad/tip/adres/telefon gerçek (siteden). Aşağıdaki her şey örnek. */
import { days, defineBranch } from "./define";

export const bundle = defineBranch({
  slug: "istanbul-buyukcekmece",
  siteSlug: "istanbul-buyukcekmece-sube",
  city: { tr: "İstanbul · Büyükçekmece", en: "Istanbul · Büyükçekmece", ar: "إسطنبول · بويوك تشكمجة" },
  price_adjust_pct: 10, // TEYİT: örnek — İstanbul fiyat katmanı +%10
  // TEYİT: çalışma saatleri örnek
  hours: [...days([1, 2, 3, 4, 7], "08:00", "00:00"), ...days([5, 6], "08:00", "01:00")],
  overrides: {
    // TEYİT: stok ve kapsam örnek — sitede şube tipi "Cafe"; ağır ana yemekler bu şubede sunulmuyor varsayıldı
    "cold-brew-sutlu": { availability: "sold_out" },
    "cafe-de-paris-soslu-bonfile": { availability: "hidden" },
    "domi-glas-soslu-bonfile": { availability: "hidden" },
    "patlican-begendili-bonfile": { availability: "hidden" },
    "mexico-steak": { availability: "hidden" },
    "guvecte-et-sote": { availability: "hidden" },
    "bodrum-cokertmesi": { availability: "hidden" },
  },
});
