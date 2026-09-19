import type { Branch, BranchBundle, BranchHours, BranchProductOverride } from "../schema";
import { productId } from "../central/products";
import { tenant } from "../central/tenant";
import { realBranch } from "./real";

type Weekday = BranchHours["weekday"];
const ALL: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

/** Aynı saatleri verilen günlere yayar. */
export const days = (weekdays: Weekday[], opens: string, closes: string): BranchHours[] =>
  weekdays.map((weekday) => ({ weekday, opens, closes }));
export const everyDay = (opens: string, closes: string) => days(ALL, opens, closes);

type OverrideInput = Pick<BranchProductOverride, "availability"> & {
  /** Tek boy ürünün mutlak şube fiyatı (TL) → variant_prices. */
  fixed_tl?: number;
  /** Yüzde katmanından sonra eklenen sabit fark (TL) → price_delta_minor. */
  delta_tl?: number;
};

interface Input {
  /** Demo URL'indeki şube yolu. */
  slug: string;
  /** Markanın sitesindeki detay sayfası yolu — gerçek alanlar buradan okunur. */
  siteSlug: string;
  city: Branch["city_i18n"];
  price_adjust_pct: number;
  hours: BranchHours[];
  /** Anahtar: ürün slug'ı (data/urunler.json). */
  overrides: Record<string, OverrideInput>;
}

export function defineBranch(i: Input): BranchBundle {
  const id = `brn_${i.slug.replace(/-/g, "_")}`;
  return {
    branch: {
      id, tenant_id: tenant.id, slug: i.slug, ...realBranch(i.siteSlug), city_i18n: i.city,
      timezone: "Europe/Istanbul", price_adjust_pct: i.price_adjust_pct, hours: i.hours,
    },
    overrides: Object.entries(i.overrides).map(([slug, o]) => {
      const pid = productId(slug);
      const out: BranchProductOverride = { branch_id: id, product_id: pid };
      if (o.availability) out.availability = o.availability;
      if (o.delta_tl !== undefined) out.price_delta_minor = o.delta_tl * 100;
      if (o.fixed_tl !== undefined) out.variant_prices = [{ variant_id: `${pid}__tek`, price_minor: o.fixed_tl * 100 }];
      return out;
    }),
    products: [],
  };
}
