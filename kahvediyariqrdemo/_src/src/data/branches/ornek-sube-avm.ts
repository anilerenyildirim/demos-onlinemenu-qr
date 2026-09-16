/**
 * Örnek Şube · AVM — gerçek bir şube DEĞİLDİR.
 * Farklar: lokasyon fiyat katmanı +%10, tarçınlı rulo tükendi, Cold Brew burada var.
 */
import type { BranchBundle, BranchHours } from "../schema";
import { ORDER_STEPS } from "../central/service";

const B = "brn_ornek_avm";
type Weekday = BranchHours["weekday"];

// TEYİT: Şube adı, adres, telefon, saatler ve fiyat farkı tamamen örnektir.
export const bundle: BranchBundle = {
  branch: {
    id: B,
    tenant_id: "tnt_kahvediyari",
    slug: "ornek-sube-avm",
    is_sample: true,
    name_i18n: { tr: "Örnek Şube · AVM", en: "Sample Branch · Mall" },
    kind_i18n: { tr: "Alışveriş merkezi içi", en: "Inside a shopping mall" },
    timezone: "Europe/Istanbul",
    price_adjust_pct: 10,
    service_mode: "self_service",
    order_steps_i18n: ORDER_STEPS.self_service,
    address_i18n: { tr: "Örnek AVM, Zemin kat, No: 0 · Örnek İlçe / İl", en: "Sample Mall, Ground floor, No. 0 · Sample District / City" },
    phone: "+90 000 000 00 01",
    hours: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ weekday: d as Weekday, opens: "10:00", closes: "22:00" })),
  },
  overrides: [
    { branch_id: B, product_id: "prd_tarcinli_rulo", availability: "sold_out" },
  ],
  products: [],
};
