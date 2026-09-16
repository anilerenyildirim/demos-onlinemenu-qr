/**
 * Örnek Şube · Cadde — gerçek bir şube DEĞİLDİR.
 * Farklar: merkez fiyatı, masaya servis, Cold Brew tükendi, şubeye özel Affogato,
 * Flat White'a sabit +5 ₺ fark.
 */
import type { BranchBundle, BranchHours } from "../schema";
import { ORDER_STEPS } from "../central/service";
import { defineProducts } from "../central/products";

const B = "brn_ornek_cadde";
type Weekday = BranchHours["weekday"];

// TEYİT: Şube adı, adres, telefon, saatler ve fiyat farkları tamamen örnektir.
export const bundle: BranchBundle = {
  branch: {
    id: B,
    tenant_id: "tnt_kahvediyari",
    slug: "ornek-sube-cadde",
    is_sample: true,
    name_i18n: { tr: "Örnek Şube · Cadde", en: "Sample Branch · High Street" },
    kind_i18n: { tr: "Cadde üzeri, bahçeli", en: "High street, with a terrace" },
    timezone: "Europe/Istanbul",
    price_adjust_pct: 0,
    service_mode: "table_service",
    order_steps_i18n: ORDER_STEPS.table_service,
    address_i18n: { tr: "Örnek Mah. Örnek Cad. No: 0 · Örnek İlçe / İl", en: "Sample St. No. 0 · Sample District / City" },
    phone: "+90 000 000 00 02",
    hours: [
      ...[1, 2, 3, 4].map((d) => ({ weekday: d as Weekday, opens: "07:30", closes: "23:00" })),
      { weekday: 5, opens: "07:30", closes: "00:30" },
      { weekday: 6, opens: "08:30", closes: "00:30" },
      { weekday: 7, opens: "08:30", closes: "23:00" },
    ],
  },
  overrides: [
    { branch_id: B, product_id: "prd_cold_brew", availability: "sold_out" },
    { branch_id: B, product_id: "prd_flat_white", price_delta_minor: 500 },
  ],
  products: defineProducts(
    [
      { // TEYİT: şubeye özel ürün örneği — ad, açıklama, alerjen, fiyat örnek
        id: "prd_cadde_affogato", category: "cat_soguk_kahve",
        name: { tr: "Affogato", en: "Affogato" },
        desc: { tr: "Vanilyalı dondurma üstüne sıcak espresso. Yalnızca bahçeli şubelerde.", en: "Hot espresso poured over vanilla ice cream. Terrace branches only." },
        variants: [[null, 140]],
        allergens: ["milk", "eggs"],
      },
    ],
    B,
  ),
};
