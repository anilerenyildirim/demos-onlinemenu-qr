/** Antalya Manavgat — ad/tip/adres/telefon gerçek (siteden). Aşağıdaki her şey örnek. */
import { defineBranch, everyDay } from "./define";

export const bundle = defineBranch({
  slug: "antalya-manavgat",
  siteSlug: "antalya-manavgat-subesi",
  city: { tr: "Antalya · Manavgat", en: "Antalya · Manavgat", ar: "أنطاليا · مانافغات" },
  price_adjust_pct: 15, // TEYİT: örnek — turizm bölgesi fiyat katmanı +%15
  hours: everyDay("08:00", "01:00"), // TEYİT: çalışma saatleri örnek
  overrides: {
    "turk-kahvesi": { fixed_tl: 140 }, // TEYİT: örnek — şubenin mutlak fiyatı, yüzde katmanını ezer
    "karadut-deryasi": { availability: "sold_out" }, // TEYİT: stok örnek
  },
});
