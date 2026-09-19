/** Balıkesir Merkez — ad/tip/adres/telefon gerçek (siteden). Aşağıdaki her şey örnek. */
import { defineBranch, everyDay } from "./define";

export const bundle = defineBranch({
  slug: "balikesir-merkez",
  siteSlug: "balikesir-merkez-subesi",
  city: { tr: "Balıkesir · Karesi", en: "Balıkesir · Karesi", ar: "باليكسير · كاراسي" },
  price_adjust_pct: 0, // TEYİT: örnek — merkez fiyatı (karşılaştırmada referans şube)
  hours: everyDay("08:00", "23:30"), // TEYİT: çalışma saatleri örnek
  overrides: {},
});
