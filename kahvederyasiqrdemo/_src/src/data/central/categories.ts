import type { Category } from "../schema";
import { tenant } from "./tenant";

/**
 * Kategoriler markanın sitesindeki dört menü sayfasıdır (slug = sitedeki yol).
 * TR adlar sitedeki başlıklar; EN/AR arayüz çevirisidir.
 */
const cat = (slug: string, sort_order: number, name_i18n: Category["name_i18n"]): Category => ({
  id: `cat_${slug.replace(/-/g, "_")}`, tenant_id: tenant.id, slug, sort_order, name_i18n,
});

export const categories: Category[] = [
  cat("sicak-icecekler", 1, { tr: "Sıcak İçecekler", en: "Hot Drinks", ar: "المشروبات الساخنة" }),
  cat("soguk-icecekler", 2, { tr: "Soğuk İçecekler", en: "Cold Drinks", ar: "المشروبات الباردة" }),
  cat("yemekler", 3, { tr: "Yemekler", en: "Food", ar: "الأطباق" }),
  cat("pastalar", 4, { tr: "Pastalar", en: "Cakes & Desserts", ar: "الكعك والحلويات" }),
];
