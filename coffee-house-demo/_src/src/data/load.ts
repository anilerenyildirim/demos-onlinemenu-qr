/**
 * Okunaklı kaynak JSON (data/menu.json, data/branches.json) → D1 satırı biçiminde tipler.
 * Panel bağlandığında bu dosyanın yerini D1 sorguları (ya da panelin export JSON'u) alır;
 * resolve.ts ve render katmanı değişmez.
 *
 * Yapısal hata (bilinmeyen kategori/boy, eksik fiyat, eksik çeviri) → build düşer.
 */
import branchesJson from "../../data/branches.json";
import menuJson from "../../data/menu.json";
import { LOCALES, type Locale } from "../config";
import {
  ALLERGENS, CURRENCIES,
  type AllergenCode, type Availability, type BrandId, type Branch, type BranchBundle, type BranchHours,
  type BranchProductOverride, type Category, type CategoryIcon, type Currency, type I18n, type Product,
  type ProductTag, type Size, type SizeKey, type Tenant,
} from "./schema";

type RawI18n = Record<string, string>;
interface RawProduct {
  slug: string; category: string; sizes: string[];
  prices: Record<string, number[]>;
  name: RawI18n; description: RawI18n;
  tags?: string[]; allergens?: string[];
  image?: { file: string; crop: number[] };
}

const fail = (msg: string): never => { throw new Error(`[veri] ${msg}`); };

function i18n(t: RawI18n | undefined, where: string): I18n {
  if (!t) return fail(`${where}: metin yok`);
  for (const l of LOCALES) if (!t[l]?.trim()) fail(`${where}: "${l}" çevirisi eksik`);
  return t as I18n;
}

const isCurrency = (c: string): c is Currency => (CURRENCIES as readonly string[]).includes(c);
const isAllergen = (a: string): a is AllergenCode => (ALLERGENS as readonly string[]).includes(a);
const idOf = (prefix: string, slug: string) => `${prefix}_${slug.replace(/-/g, "_")}`;
const minor = (major: number) => Math.round(major * 100);

// ─── tenant + sabit sözlükler ───────────────────────────────────────────────
export const tenant: Tenant = {
  id: menuJson.tenant.id,
  slug: menuJson.tenant.slug,
  name: menuJson.tenant.name,
  default_locale: menuJson.tenant.default_locale as Locale,
  locales: menuJson.tenant.locales as Locale[],
  menu_version: menuJson.version,
  rounding_minor: Object.fromEntries(Object.entries(menuJson.rounding).map(([c, v]) => [c, minor(v)])) as Tenant["rounding_minor"],
};

export const sizes: Record<SizeKey, Size> = Object.fromEntries(
  Object.entries(menuJson.sizes).map(([key, s]) => [key, {
    key: key as SizeKey,
    short_i18n: s ? i18n(s.short, `boy ${key}.short`) : null,
    label_i18n: s ? i18n(s.label, `boy ${key}.label`) : null,
    ml: s?.ml ?? null,
  }]),
) as Record<SizeKey, Size>;

export const categories: Category[] = menuJson.categories.map((c, i) => ({
  id: idOf("cat", c.slug),
  tenant_id: tenant.id,
  slug: c.slug,
  sort_order: i + 1,
  icon: c.icon as CategoryIcon,
  name_i18n: i18n(c.name, `kategori ${c.slug}`),
}));

/** Ürün kimliği slug'dan türetilir; override anahtarları slug'dır. */
export const productId = (slug: string) => idOf("prd", slug);
export const variantId = (productSlug: string, size: string) => `${productId(productSlug)}__${size}`;

/** Görsel kırpımı: build bu listeyle AVIF/WebP üretir (kaynak _ref/galeri/<file>, kare [x, y, kenar]). */
export interface ImageCrop { key: string; file: string; crop: [number, number, number] }
export const productImages: ImageCrop[] = [];

function toProduct(p: RawProduct, sort: number, branch_id: string | null, allowed: Currency[]): Product {
  const where = `ürün ${p.slug}`;
  const category = categories.find((c) => c.slug === p.category) ?? fail(`${where}: bilinmeyen kategori ${p.category}`);
  for (const s of p.sizes) if (!(s in sizes)) fail(`${where}: bilinmeyen boy ${s}`);
  if (p.sizes.length === 0) fail(`${where}: boy yok`);
  const id = productId(p.slug);
  for (const [cur, list] of Object.entries(p.prices)) {
    if (!isCurrency(cur)) fail(`${where}: bilinmeyen para birimi ${cur}`);
    if (list.length !== p.sizes.length) fail(`${where}: ${cur} fiyat sayısı boy sayısıyla aynı değil`);
  }
  for (const cur of allowed) if (!p.prices[cur]) fail(`${where}: ${cur} fiyatı yok`);
  const allergens = (p.allergens ?? []).map((a) => (isAllergen(a) ? a : fail(`${where}: bilinmeyen alerjen ${a}`)));
  const tags = (p.tags ?? []).map((t) => (t === "new" ? t : fail(`${where}: bilinmeyen etiket ${t}`))) as ProductTag[];
  let image_key: string | null = null;
  if (p.image) {
    if (p.image.crop.length !== 3) fail(`${where}: kırpım [x, y, kenar] olmalı`);
    image_key = `urun-${p.slug}`;
    productImages.push({ key: image_key, file: p.image.file, crop: p.image.crop as [number, number, number] });
  }
  return {
    id, tenant_id: tenant.id, branch_id, category_id: category.id, slug: p.slug,
    sort_order: category.sort_order * 1000 + sort + (branch_id ? 500 : 0),
    name_i18n: i18n(p.name, `${where}.name`),
    description_i18n: i18n(p.description, `${where}.description`),
    image_key, tags, allergens,
    variants: p.sizes.map((size, i) => ({
      id: variantId(p.slug, size), product_id: id, sort_order: i + 1, size: size as SizeKey,
      prices: Object.fromEntries(Object.entries(p.prices).map(([cur, list]) => [cur, minor(list[i])])),
    })),
  };
}

export const products: Product[] = (menuJson.products as RawProduct[]).map((p, i) => toProduct(p, i + 1, null, [...CURRENCIES]));

// ─── şubeler ────────────────────────────────────────────────────────────────
interface RawBranch {
  slug: string; network_id: string; brand: string;
  name: RawI18n; city: RawI18n; address: RawI18n;
  currency: string; price_adjust_pct: number; default_locale: string; timezone: string;
  hours: { days: number[]; opens: string; closes: string }[];
  overrides: Record<string, { availability?: string; campaign?: boolean; prices?: Record<string, number> }>;
  products: RawProduct[];
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const branches: BranchBundle[] = (branchesJson.branches as unknown as RawBranch[]).map((b): BranchBundle => {
  const where = `şube ${b.slug}`;
  const id = idOf("brn", b.slug);
  if (!isCurrency(b.currency)) fail(`${where}: bilinmeyen para birimi ${b.currency}`);
  if (!(LOCALES as readonly string[]).includes(b.default_locale)) fail(`${where}: bilinmeyen dil ${b.default_locale}`);
  if (b.brand !== "coffee-house" && b.brand !== "coffee-art") fail(`${where}: bilinmeyen marka ${b.brand}`);
  const hours: BranchHours[] = b.hours.flatMap((h) => h.days.map((d) => {
    if (d < 1 || d > 7) fail(`${where}: gün 1–7 olmalı`);
    if (!HHMM.test(h.opens) || !HHMM.test(h.closes)) fail(`${where}: saat HH:MM olmalı`);
    return { weekday: d as BranchHours["weekday"], opens: h.opens, closes: h.closes };
  }));
  if (new Set(hours.map((h) => h.weekday)).size !== hours.length) fail(`${where}: aynı gün iki kez`);
  const currency = b.currency as Currency;

  const branchProducts = b.products.map((p, i) => toProduct(p, i + 1, id, [currency]));
  const all = [...products, ...branchProducts];
  const overrides: BranchProductOverride[] = Object.entries(b.overrides).map(([slug, o]) => {
    const product = all.find((p) => p.slug === slug) ?? fail(`${where}: override bilinmeyen ürüne: ${slug}`);
    const out: BranchProductOverride = { branch_id: id, product_id: product.id };
    if (o.availability) {
      if (!["available", "sold_out", "hidden"].includes(o.availability)) fail(`${where}/${slug}: bilinmeyen durum ${o.availability}`);
      out.availability = o.availability as Availability;
    }
    if (o.campaign) {
      if (!o.prices) fail(`${where}/${slug}: kampanya fiyatsız olamaz`);
      out.campaign = true;
    }
    if (o.prices) {
      out.variant_prices = Object.entries(o.prices).map(([size, major]) => {
        const v = product.variants.find((x) => x.size === size) ?? fail(`${where}/${slug}: ürünün "${size}" boyu yok`);
        return { variant_id: v.id, price_minor: minor(major) };
      });
    }
    return out;
  });

  const branch: Branch = {
    id, tenant_id: tenant.id, slug: b.slug, network_id: b.network_id, brand: b.brand as BrandId,
    name_i18n: i18n(b.name, `${where}.name`),
    city_i18n: i18n(b.city, `${where}.city`),
    address_i18n: i18n(b.address, `${where}.address`),
    currency, price_adjust_pct: b.price_adjust_pct,
    default_locale: b.default_locale as Locale,
    locales: [...tenant.locales],
    timezone: b.timezone,
    hours,
  };
  return { branch, overrides, products: branchProducts };
});
