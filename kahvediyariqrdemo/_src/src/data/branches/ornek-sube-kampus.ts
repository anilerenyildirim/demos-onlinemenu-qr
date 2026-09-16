/**
 * Örnek Şube · Kampüs — gerçek bir şube DEĞİLDİR.
 * Farklar: fiyat katmanı -%5, filtre kahvede mutlak şube fiyatı, raf ürünleri (paket kahve)
 * bu şubede yok, pazar kapalı.
 */
import type { BranchBundle, BranchHours } from "../schema";
import { ORDER_STEPS } from "../central/service";

const B = "brn_ornek_kampus";
type Weekday = BranchHours["weekday"];

// TEYİT: Şube adı, adres, telefon, saatler ve fiyat farkları tamamen örnektir.
export const bundle: BranchBundle = {
  branch: {
    id: B,
    tenant_id: "tnt_kahvediyari",
    slug: "ornek-sube-kampus",
    is_sample: true,
    name_i18n: { tr: "Örnek Şube · Kampüs", en: "Sample Branch · Campus" },
    kind_i18n: { tr: "Üniversite kampüsü içi", en: "On a university campus" },
    timezone: "Europe/Istanbul",
    price_adjust_pct: -5,
    service_mode: "self_service",
    order_steps_i18n: ORDER_STEPS.self_service,
    address_i18n: { tr: "Örnek Üniversitesi, Merkez Kütüphane girişi · Örnek İlçe / İl", en: "Sample University, Main Library entrance · Sample District / City" },
    phone: "+90 000 000 00 03",
    hours: [
      ...[1, 2, 3, 4, 5].map((d) => ({ weekday: d as Weekday, opens: "07:00", closes: "21:00" })),
      { weekday: 6, opens: "09:00", closes: "18:00" },
    ],
  },
  overrides: [
    {
      branch_id: B, product_id: "prd_filtre",
      variant_prices: [
        { variant_id: "prd_filtre__s", price_minor: 7000 },
        { variant_id: "prd_filtre__m", price_minor: 8000 },
        { variant_id: "prd_filtre__l", price_minor: 9000 },
      ],
    },
    ...["prd_ev_harmani", "prd_filtre_paket", "prd_turk_kahvesi_paket", "prd_tek_koken"].map((product_id) => ({
      branch_id: B, product_id, availability: "hidden" as const,
    })),
  ],
  products: [],
};
