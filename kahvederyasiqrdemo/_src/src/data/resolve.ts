/**
 * Merkez menü + şube override katmanı → o şubenin menüsü.
 * Panelde aynı mantık bir sorgu/servis katmanında çalışacak; burada build sırasında çalışır.
 *
 * Fiyat sırası (her varyant için):
 *   1. merkez fiyatı
 *   2. şube yüzde farkı (price_adjust_pct) → tenant.price_rounding_minor adımına yuvarlanır
 *   3. ürün bazlı sabit fark (price_delta_minor)
 *   4. varyant bazlı mutlak şube fiyatı (variant_prices) — varsa hepsini ezer
 */
import type {
  Availability, BranchBundle, Category, MinorUnits, Product, Tenant,
} from "./schema";

export type PriceSource = "central" | "branch_pct" | "branch_delta" | "branch_fixed";

export interface ResolvedVariant {
  id: string;
  label_i18n: Product["variants"][number]["label_i18n"];
  price_minor: MinorUnits;
  central_price_minor: MinorUnits;
  source: PriceSource;
}

export interface ResolvedProduct {
  product: Product;
  availability: Availability;
  /** true → merkez ürünü değil, yalnızca bu şubede. */
  branch_only: boolean;
  variants: ResolvedVariant[];
  /** En az bir varyantın fiyatı merkezden farklı mı? */
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

  const byProduct = new Map(overrides.map((o) => [o.product_id, o]));
  const round = (v: number) => Math.round(v / tenant.price_rounding_minor) * tenant.price_rounding_minor;

  const resolveProduct = (product: Product): ResolvedProduct => {
    const o = byProduct.get(product.id);
    const branch_only = product.branch_id !== null;
    const variants = product.variants.map((v): ResolvedVariant => {
      let price = v.price_minor;
      let source: PriceSource = "central";
      // Şubeye özel ürünün fiyatı zaten şube fiyatıdır; yüzde katmanı yalnızca merkez ürünlerine uygulanır.
      if (!branch_only && branch.price_adjust_pct !== 0) {
        price = round(price * (1 + branch.price_adjust_pct / 100));
        source = "branch_pct";
      }
      if (o?.price_delta_minor) {
        price += o.price_delta_minor;
        source = "branch_delta";
      }
      const fixed = o?.variant_prices?.find((vp) => vp.variant_id === v.id);
      if (fixed) {
        price = fixed.price_minor;
        source = "branch_fixed";
      }
      return { id: v.id, label_i18n: v.label_i18n, price_minor: price, central_price_minor: v.price_minor, source };
    });
    return {
      product,
      availability: o?.availability ?? "available",
      branch_only,
      variants,
      price_differs: !branch_only && variants.some((v) => v.price_minor !== v.central_price_minor),
    };
  };

  const all = [...centralProducts, ...branchProducts].sort((a, b) => a.sort_order - b.sort_order);
  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({
      category,
      items: all.filter((p) => p.category_id === category.id).map(resolveProduct),
    }))
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
    productIds.add(p.id);
    for (const v of p.variants) variantIds.add(v.id);
  }
  for (const p of b.products) if (p.branch_id !== b.branch.id) fail(`${p.id}: branch_id bu şube değil`);
  for (const o of b.overrides) {
    if (o.branch_id !== b.branch.id) fail(`override ${o.product_id}: branch_id bu şube değil`);
    if (!productIds.has(o.product_id)) fail(`override bilinmeyen ürüne: ${o.product_id}`);
    for (const vp of o.variant_prices ?? []) {
      if (!variantIds.has(vp.variant_id)) fail(`override bilinmeyen varyanta: ${vp.variant_id}`);
    }
  }
}
