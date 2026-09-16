/**
 * Örnek Şube · Yol Üstü — gerçek bir şube DEĞİLDİR.
 * Farklar: fiyat katmanı +%5, gel-al + self servis, sahlep bu şubede yok, cheesecake tükendi,
 * şubeye özel termos filtre kahve.
 */
import type { BranchBundle, BranchHours } from "../schema";
import { ORDER_STEPS } from "../central/service";
import { defineProducts } from "../central/products";

const B = "brn_ornek_yol_ustu";
type Weekday = BranchHours["weekday"];

// TEYİT: Şube adı, adres, telefon, saatler ve fiyat farkları tamamen örnektir.
export const bundle: BranchBundle = {
  branch: {
    id: B,
    tenant_id: "tnt_kahvediyari",
    slug: "ornek-sube-yol-ustu",
    is_sample: true,
    name_i18n: { tr: "Örnek Şube · Yol Üstü", en: "Sample Branch · Roadside" },
    kind_i18n: { tr: "Otoyol tesisi, gel-al pencereli", en: "Highway stop with a grab-and-go window" },
    timezone: "Europe/Istanbul",
    price_adjust_pct: 5,
    service_mode: "mixed",
    order_steps_i18n: ORDER_STEPS.mixed,
    address_i18n: { tr: "Örnek Otoyolu, Örnek Tesisleri · Örnek İlçe / İl", en: "Sample Highway, Sample Service Area · Sample District / City" },
    phone: "+90 000 000 00 04",
    hours: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d as Weekday, opens: "06:00", closes: "24:00" })),
  },
  overrides: [
    { branch_id: B, product_id: "prd_sahlep", availability: "hidden" },
    { branch_id: B, product_id: "prd_cheesecake", availability: "sold_out" },
  ],
  products: defineProducts(
    [
      { // TEYİT: şubeye özel ürün örneği — ad, açıklama, fiyat örnek
        id: "prd_yol_termos", category: "cat_sicak_kahve",
        name: { tr: "Yol termosu: filtre kahve 1 L", en: "Road flask: filter coffee 1 L" },
        desc: { tr: "Uzun yol için dört fincanlık taze filtre, kapaklı termosta.", en: "Four cups of fresh filter coffee for the road, in a lidded flask." },
        variants: [[null, 290]],
        tags: ["new", "vegan"],
      },
    ],
    B,
  ),
};
