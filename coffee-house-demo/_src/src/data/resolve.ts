/**
 * Merkez katalog + şube override katmanı → o şubenin menüsü.
 * Panelde aynı mantık bir sorgu/servis katmanında çalışacak; burada build sırasında çalışır.
 *
 * Fiyat sırası (her varyant için, şubenin para biriminde):
 *   1. merkez fiyat listesi (product_variant_prices, currency = şube para birimi)
 *   2. şube yüzde katmanı (price_adjust_pct) → tenant.rounding_minor[currency] adımına yuvarlanır
 *      (yalnızca merkez ürünlerine; şubeye özel ürünün fiyatı zaten şube fiyatıdır)
 *   3. varyant bazlı mutlak şube fiyatı (variant_prices) — varsa öncekileri ezer.
 *      campaign = true ise bu fiyat kampanya fiyatıdır; 2. adımın sonucu "önceki fiyat" olarak gösterilir.
 */
import type {
  Availability, BranchBundle, Category, Currency, MinorUnits, Product, SizeKey, Tenant,
} from "./schema";

export type PriceSource = "central" | "branch_pct" | "branch_fixed" | "campaign";

export interface ResolvedVariant {
  id: string;
  size: SizeKey;
  price_minor: MinorUnits;
  /** Kampanya/şube sabit fiyatından önceki fiyat (katman dahil) — kampanyada üstü çizili gösterilir */
  regular_minor: MinorUnits;
  /** Merkez fiyat listesindeki fiyat */
  central_minor: MinorUnits;
  source: PriceSource;
}

export interface ResolvedProduct {
  product: Product;
  availability: Availability;
  campaign: boolean;
  /** true → merkez ürünü değil, yalnızca bu şubede */
  branch_only: boolean;
  variants: ResolvedVariant[];
  /** Ürün bazında şube kararı var mı (sabit fiyat / kampanya)? Yüzde katmanı sayılmaz. */
  price_differs: boolean;
}

export interface ResolvedCategory {
  category: Category;
  items: ResolvedProduct[];
}

export function resolveMenu(
  tenant: Tenant,
  categories: Category[],
  centralProducts: Product[],
  { branch, overrides, products: branchProducts }: BranchBundle,
): ResolvedCategory[] {
  validate(tenant, categories, centralProducts, { branch, overrides, products: branchProducts });

  const currency: Currency = branch.currency;
  const step = tenant.rounding_minor[currency];
  const round = (v: number) => Math.round(v / step) * step;
  const byProduct = new Map(overrides.map((o) => [o.product_id, o]));

  const resolveProduct = (product: Product): ResolvedProduct => {
    const o = byProduct.get(product.id);
    const branch_only = product.branch_id !== null;
    const variants = product.variants.map((v): ResolvedVariant => {
      const central = v.prices[currency]!;
      let price = central;
      let source: PriceSource = "central";
      if (!branch_only && branch.price_adjust_pct !== 0) {
        price = round(central * (1 + branch.price_adjust_pct / 100));
        source = "branch_pct";
      }
      const regular = price;
      const fixed = o?.variant_prices?.find((vp) => vp.variant_id === v.id);
      if (fixed) {
        price = fixed.price_minor;
        source = o?.campaign ? "campaign" : "branch_fixed";
      }
      return { id: v.id, size: v.size, price_minor: price, regular_minor: regular, central_minor: central, source };
    });
    return {
      product,
      availability: o?.availability ?? "available",
      campaign: !!o?.campaign,
      branch_only,
      variants,
      price_differs: variants.some((v) => v.source === "branch_fixed" || v.source === "campaign"),
    };
  };

  const all = [...centralProducts, ...branchProducts].sort((a, b) => a.sort_order - b.sort_order);
  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({ category, items: all.filter((p) => p.category_id === category.id).map(resolveProduct) }))
    .filter((c) => c.items.length > 0);
}

/** Panelde yabancı anahtar kısıtlarının yapacağı işi build'de yapar: bozuk referans → build düşer. */
function validate(tenant: Tenant, categories: Category[], central: Product[], b: BranchBundle): void {
  const fail = (msg: string) => { throw new Error(`[${b.branch.slug}] ${msg}`); };
  const categoryIds = new Set(categories.map((c) => c.id));
  const productIds = new Set<string>();
  const variantIds = new Set<string>();

  if (b.branch.tenant_id !== tenant.id) fail(`tenant_id uyuşmuyor: ${b.branch.tenant_id}`);
  for (const p of [...central, ...b.products]) {
    if (p.tenant_id !== tenant.id) fail(`${p.id}: tenant_id uyuşmuyor`);
    if (productIds.has(p.id)) fail(`yinelenen ürün kimliği: ${p.id}`);
    if (!categoryIds.has(p.category_id)) fail(`${p.id}: bilinmeyen kategori ${p.category_id}`);
    if (p.variants.length === 0) fail(`${p.id}: varyant yok`);
    for (const v of p.variants) {
      if (v.prices[b.branch.currency] === undefined) fail(`${v.id}: ${b.branch.currency} fiyatı yok`);
      variantIds.add(v.id);
    }
    productIds.add(p.id);
  }
  for (const p of b.products) if (p.branch_id !== b.branch.id) fail(`${p.id}: branch_id bu şube değil`);
  for (const o of b.overrides) {
    if (o.branch_id !== b.branch.id) fail(`override ${o.product_id}: branch_id bu şube değil`);
    if (!productIds.has(o.product_id)) fail(`override bilinmeyen ürüne: ${o.product_id}`);
    for (const vp of o.variant_prices ?? []) if (!variantIds.has(vp.variant_id)) fail(`override bilinmeyen varyanta: ${vp.variant_id}`);
    if (o.campaign && !o.variant_prices?.length) fail(`kampanya fiyatsız: ${o.product_id}`);
  }
}
