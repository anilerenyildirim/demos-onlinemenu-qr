/**
 * Menü sayfasına gömülen istemci durumu (<script type="application/json" id="state">).
 * Şube değişince sayfa yenilenmez: fiyat, stok, rozet, tema ve saatler bu tablodan anında uygulanır.
 * Aynı veri her şubenin statik sayfasına da basılır — JS yoksa şube bağlantıları tam sayfa açar.
 *
 * Kart dizisi TÜM şubelerde aynıdır: merkez ürünleri + her şubenin şubeye özel ürünleri (başka şubede "h").
 */
import type { Locale } from "../config";
import type { AllergenCode, BranchHours, BrandId, CategoryIcon, Currency, ProductTag, SizeKey } from "../data/schema";

export interface ClientImage { avif: string; webp: string; src: string }

export interface ClientProduct {
  /** ad */ n: string;
  /** açıklama */ d: string;
  /** kategori ikonu (görsel yoksa) */ c: CategoryIcon;
  img: ClientImage | null;
  /** boy anahtarları, varyant sırasıyla */ v: SizeKey[];
  t: ProductTag[];
  al: AllergenCode[];
}

export interface ClientBranch {
  slug: string;
  brand: BrandId;
  brandName: string;
  name: string;
  city: string;
  address: string;
  tz: string;
  hours: BranchHours[];
  currency: Currency;
  /** Bu şubenin her dildeki menü adresi (dil bağlantıları için) */
  url: Record<Locale, string>;
  title: string;
  tier: string;
  maps: string;
  /** kart × varyant fiyatı (en küçük birim) */ p: number[][];
  /** kampanya/şube fiyatından önceki fiyat */ r: number[][];
  /** merkez fiyat listesi */ cp: number[][];
  /** kart durumu: a = var, s = tükendi, h = bu şubede yok */ a: string;
  /** kart bayrağı: "-" yok, "c" kampanya, "x" şube sabit fiyatı, "o" şubeye özel ürün */ f: string;
}

export interface MenuClientStrings {
  openNow: string; closedNow: string; closedNoHours: string; today: string; tomorrow: string;
  hiddenHere: string; switched: string; soldOut: string; new: string; campaign: string; branchOnly: string;
  was: string; sizes: string; ml: string; allergens: string; noAllergens: string; allergenNote: string;
  diffCentral: string; diffSummary: string; close: string;
}

export interface MenuState {
  locale: Locale;
  /** Bu statik sayfanın şubesi */
  page: string;
  t: MenuClientStrings;
  sizes: Record<SizeKey, { s: string | null; l: string | null; ml: number | null }>;
  allergens: Record<AllergenCode, string>;
  products: ClientProduct[];
  branches: ClientBranch[];
}
