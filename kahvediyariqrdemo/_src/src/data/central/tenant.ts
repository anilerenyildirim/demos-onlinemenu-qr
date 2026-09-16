import type { Tenant } from "../schema";

// TEYİT: Kiracı kimliği/slug panelde nasıl üretiliyorsa ona göre değişecek.
export const tenant: Tenant = {
  id: "tnt_kahvediyari",
  slug: "kahvediyari",
  name: "Kahve Diyarı",
  default_locale: "tr",
  locales: ["tr", "en"],
  currency: "TRY",
  price_rounding_minor: 500, // TEYİT: şube yüzde farkı sonrası 5 ₺'ye yuvarlama — örnek kural
};
