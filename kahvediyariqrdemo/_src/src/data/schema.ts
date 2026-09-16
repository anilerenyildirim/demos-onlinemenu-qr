/**
 * Veri şeması — merkez menü (tenant) + şube override katmanı (branch).
 *
 * Tipler bilerek D1 satırı biçiminde tutuldu: alan adları snake_case, fiyatlar kuruş (tam sayı),
 * kimlikler metin, çok dilli alanlar `*_i18n` JSON sütunu olarak düşünülmeli.
 * Tablo karşılıkları ve panel.onlinemenu-qr.com ile eşleme notu: ../../SCHEMA.md
 *
 * TEYİT: Panelin gerçek D1 şeması bu çalışma sırasında erişilebilir değildi; alan adları
 * panelin tenant/branch mantığına göre önerilmiştir, bağlanmadan önce karşılaştırılmalı.
 */

export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** D1: TEXT sütununda JSON — {"tr": "...", "en": "..."} */
export type LocalizedText = Record<Locale, string>;

/** Para birimi en küçük biriminde (kuruş). 125,00 ₺ → 12500 */
export type MinorUnits = number;

/** AB 14 alerjen listesi (1169/2011 Ek II) — panelde sabit sözlük tablosu olarak tutulabilir. */
export type AllergenCode =
  | "gluten" | "crustaceans" | "eggs" | "fish" | "peanuts" | "soy" | "milk"
  | "nuts" | "celery" | "mustard" | "sesame" | "sulphites" | "lupin" | "molluscs";

export type ProductTag = "new" | "seasonal" | "vegan";

export type CategoryIcon = "hot" | "iced" | "tea" | "cold" | "pastry" | "snack" | "beans";

// ─── tenants ────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  default_locale: Locale;
  locales: Locale[];
  currency: "TRY";
  /** Şube yüzde farkı uygulandığında fiyatın yuvarlanacağı adım (kuruş). */
  price_rounding_minor: MinorUnits;
}

// ─── categories (tenant_id) ─────────────────────────────────────────────────
export interface Category {
  id: string;
  tenant_id: string;
  slug: string;
  sort_order: number;
  icon: CategoryIcon;
  name_i18n: LocalizedText;
  description_i18n: LocalizedText | null;
}

// ─── products (tenant_id, branch_id NULL = merkez ürünü) ────────────────────
export interface Product {
  id: string;
  tenant_id: string;
  /** null → merkez menüsü. Dolu → yalnızca o şubeye özel ürün (aynı tabloda). */
  branch_id: string | null;
  category_id: string;
  slug: string;
  sort_order: number;
  name_i18n: LocalizedText;
  description_i18n: LocalizedText;
  /** R2/görsel deposu anahtarı. null → arayüz kategori placeholder'ı gösterir. */
  image_key: string | null;
  tags: ProductTag[];
  allergens: AllergenCode[];
  variants: ProductVariant[];
}

// ─── product_variants (product_id) — boy / gramaj ───────────────────────────
export interface ProductVariant {
  id: string;
  product_id: string;
  sort_order: number;
  /** Tek varyantlı üründe null: arayüz boy etiketi göstermez. */
  label_i18n: LocalizedText | null;
  price_minor: MinorUnits;
}

// ─── branches (tenant_id) ───────────────────────────────────────────────────
export type ServiceMode = "self_service" | "table_service" | "mixed";

export interface BranchHours {
  /** ISO hafta günü: 1 = Pazartesi … 7 = Pazar. Kapalı gün satırı yoktur. */
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** "HH:MM". closes < opens ise ertesi güne sarkar (ör. 07:30–00:30). */
  opens: string;
  closes: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  slug: string;
  /** Demo verisi: gerçek şube değildir, arayüzde "Örnek Şube" olarak etiketlenir. */
  is_sample: boolean;
  name_i18n: LocalizedText;
  /** Şube tipi kısa açıklaması (AVM, cadde…) — şube seçicide ikinci satır. */
  kind_i18n: LocalizedText;
  timezone: "Europe/Istanbul";
  /** Merkez fiyatlarına uygulanan yüzde farkı (bölge / lokasyon fiyat katmanı). 0 = merkez fiyatı. */
  price_adjust_pct: number;
  service_mode: ServiceMode;
  /** Sipariş → ödeme → teslim akışı; sırası anlamlıdır. D1: branch_order_steps (branch_id, sort_order). */
  order_steps_i18n: LocalizedText[];
  address_i18n: LocalizedText;
  phone: string;
  hours: BranchHours[];
}

// ─── branch_product_overrides (branch_id, product_id) ───────────────────────
export type Availability = "available" | "sold_out" | "hidden";

export interface BranchProductOverride {
  branch_id: string;
  product_id: string;
  /** hidden → bu şubede sunulmuyor; sold_out → menüde görünür ama sipariş verilemez. */
  availability?: Availability;
  /** Şube yüzde farkından SONRA tüm varyantlara eklenen sabit fark (kuruş, negatif olabilir). */
  price_delta_minor?: MinorUnits;
  /** Belirli varyant için mutlak şube fiyatı — diğer tüm kuralları ezer. */
  variant_prices?: { variant_id: string; price_minor: MinorUnits }[];
}

/** Bir şube dosyasının dışa aktardığı paket: şube satırı + override'lar + şubeye özel ürünler. */
export interface BranchBundle {
  branch: Branch;
  overrides: BranchProductOverride[];
  products: Product[];
}
