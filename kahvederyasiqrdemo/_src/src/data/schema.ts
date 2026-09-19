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

export const LOCALES = ["tr", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

/** D1: TEXT sütununda JSON — {"tr": "...", "en": "...", "ar": "..."} */
export type LocalizedText = Record<Locale, string>;

/**
 * Yalnızca varsayılan dili zorunlu metin. Ürün ve şube adları markanın kendi yazımıdır, çevrilmez;
 * diğer diller boşsa arayüz `tr` değerini gösterir.
 */
export type NameText = { tr: string } & Partial<Record<Locale, string>>;

/** Para birimi en küçük biriminde (kuruş). 125,00 ₺ → 12500 */
export type MinorUnits = number;

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
  name_i18n: LocalizedText;
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
  name_i18n: NameText;
  /** Görsel deposu anahtarı: "<kategori>/<slug>" → urunler/<anahtar>-<genişlik>.{avif,webp} */
  image_key: string | null;
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
export interface BranchHours {
  /** ISO hafta günü: 1 = Pazartesi … 7 = Pazar. Kapalı gün satırı yoktur. */
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** "HH:MM". closes < opens ise ertesi güne sarkar (ör. 08:00–01:00). */
  opens: string;
  closes: string;
}

/** Markanın sitesindeki şube tipi. */
export type BranchKind = "cafe" | "cafe_restaurant";

export interface Branch {
  id: string;
  tenant_id: string;
  slug: string;
  /** Sitedeki şube adı, aynen. */
  name_i18n: NameText;
  kind: BranchKind;
  /** Arayüzde şube adının altındaki kısa konum satırı (il / ilçe). */
  city_i18n: NameText;
  address: string;
  phone: string;
  email: string | null;
  timezone: "Europe/Istanbul";
  /** Merkez fiyatlarına uygulanan yüzde farkı (bölge / lokasyon fiyat katmanı). 0 = merkez fiyatı. */
  price_adjust_pct: number;
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

/** Görünen metin: istenen dil yoksa varsayılan dil. */
export const pick = (t: NameText, l: Locale) => t[l] ?? t.tr;
