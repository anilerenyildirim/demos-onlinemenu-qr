/**
 * Veri şeması — merkez katalog (tenant) + şube override katmanı (branch), çok para birimli.
 *
 * Tipler bilerek D1 satırı biçiminde: alan adları snake_case, fiyatlar en küçük birimde (tam sayı),
 * kimlikler metin, çok dilli alanlar `*_i18n` JSON sütunu. Kaynak veri okunaklı JSON'dadır
 * (data/menu.json, data/branches.json); load.ts bu satırlara çevirir ve doğrular.
 * Tablo karşılıkları ve panel.onlinemenu-qr.com eşleme notu: ../../SCHEMA.md
 *
 * TEYİT: Panelin gerçek D1 şeması bu çalışma sırasında erişilebilir değildi; alan adları önerilmiştir.
 */
import type { Locale } from "../config";

export type { Locale };
export type I18n = Record<Locale, string>;
/** Para birimi en küçük biriminde: 125,00 ₺ → 12500 · 18,00 AED → 1800 · 220 сом → 22000 */
export type MinorUnits = number;

export const CURRENCIES = ["TRY", "AED", "KGS"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type BrandId = "coffee-house" | "coffee-art";

/** AB 14 alerjen listesi (1169/2011 Ek II) — panelde sabit sözlük tablosu. */
export const ALLERGENS = [
  "gluten", "crustaceans", "eggs", "fish", "peanuts", "soy", "milk",
  "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
] as const;
export type AllergenCode = (typeof ALLERGENS)[number];

/** Merkezde tanımlanan, tüm ağda görünen etiket. Kampanya şube/seçili şube düzeyindedir (override). */
export type ProductTag = "new";

export type SizeKey = "one" | "s" | "m" | "l" | "single" | "double";
export type CategoryIcon = "espresso" | "filter" | "cezve" | "iced" | "frappe" | "tea" | "cake" | "snack";

// ─── tenants ────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  slug: string;
  name: string;
  default_locale: Locale;
  locales: Locale[];
  /** Menü verisinin sürümü (panelde yayın kaydı) */
  menu_version: string;
  /** Şube yüzde farkı sonrası yuvarlama adımı, para birimine göre (en küçük birim) */
  rounding_minor: Record<Currency, MinorUnits>;
}

// ─── sizes (sabit sözlük) ───────────────────────────────────────────────────
export interface Size {
  key: SizeKey;
  /** Kart üzerindeki kısa etiket (S/M/L, Tek/Duble). "one" → etiket yok. */
  short_i18n: I18n | null;
  label_i18n: I18n | null;
  ml: number | null;
}

// ─── categories (tenant_id) ─────────────────────────────────────────────────
export interface Category {
  id: string;
  tenant_id: string;
  slug: string;
  sort_order: number;
  icon: CategoryIcon;
  name_i18n: I18n;
}

// ─── products (tenant_id, branch_id NULL = merkez ürünü) ────────────────────
export interface Product {
  id: string;
  tenant_id: string;
  /** null → merkez kataloğu. Dolu → yalnızca o şubeye özel ürün (aynı tablo). */
  branch_id: string | null;
  category_id: string;
  slug: string;
  sort_order: number;
  name_i18n: I18n;
  description_i18n: I18n;
  /** Görsel deposu anahtarı: "urun/<slug>" → assets/img/urun-<slug>-<w>.{avif,webp}. null → kategori ikonu */
  image_key: string | null;
  tags: ProductTag[];
  allergens: AllergenCode[];
  variants: ProductVariant[];
}

// ─── product_variants + product_variant_prices ──────────────────────────────
export interface ProductVariant {
  id: string;
  product_id: string;
  sort_order: number;
  size: SizeKey;
  /** D1: product_variant_prices (variant_id, currency, price_minor) — her para birimi ayrı fiyat listesidir, kur çevrimi yok */
  prices: Partial<Record<Currency, MinorUnits>>;
}

// ─── branches (tenant_id) ───────────────────────────────────────────────────
export interface BranchHours {
  /** ISO hafta günü: 1 = Pazartesi … 7 = Pazar. Kapalı gün satırı yoktur. */
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** "HH:MM". closes <= opens ise ertesi güne sarkar (ör. 08:00–02:00). */
  opens: string;
  closes: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  slug: string;
  /** Ağ verisindeki lokasyon (data/ag.json) */
  network_id: string;
  /** Aynı katalog, iki marka kimliği — tema ve logo buradan */
  brand: BrandId;
  name_i18n: I18n;
  city_i18n: I18n;
  address_i18n: I18n;
  /** Şubenin fiyat listesi = para birimi */
  currency: Currency;
  /** Merkez fiyatına uygulanan yüzde (bölgesel katman). 0 = merkez fiyatı. */
  price_adjust_pct: number;
  /** QR'ın açtığı dil */
  default_locale: Locale;
  locales: Locale[];
  timezone: string;
  hours: BranchHours[];
}

// ─── branch_product_overrides (branch_id, product_id) ───────────────────────
export type Availability = "available" | "sold_out" | "hidden";

export interface BranchProductOverride {
  branch_id: string;
  product_id: string;
  /** hidden → bu şubede sunulmuyor; sold_out → menüde görünür, sipariş alınmaz */
  availability?: Availability;
  /** true → "Kampanya" rozeti; variant_prices kampanya fiyatıdır, önceki fiyat üstü çizili gösterilir */
  campaign?: boolean;
  /** Varyant bazlı mutlak şube fiyatı (şubenin para biriminde) — diğer kuralları ezer */
  variant_prices?: { variant_id: string; price_minor: MinorUnits }[];
}

/** Bir şube kaydı: şube satırı + override'lar + şubeye özel ürünler. */
export interface BranchBundle {
  branch: Branch;
  overrides: BranchProductOverride[];
  products: Product[];
}

/** Görünen metin: istenen dil yoksa varsayılan dil. */
export const pick = (t: Partial<I18n> & { tr: string }, l: Locale) => t[l] ?? t.tr;
