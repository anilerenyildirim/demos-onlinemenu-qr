/**
 * Sayfaya gömülen istemci durumu (<script type="application/json" id="state">).
 * Şube değişince sayfa yenilenmez: fiyat, stok ve saat bu tablodan anında uygulanır.
 * Aynı veri her şubenin statik sayfasına da basılmıştır — JS yoksa şube bağlantıları tam sayfa açar.
 */
import type { BranchHours, Locale } from "../data/schema";

export interface ClientBranch {
  slug: string;
  name: string;
  city: string;
  kind: string;
  address: string;
  phone: string;
  tel: string;
  tz: string;
  hours: BranchHours[];
  /** Bu şubenin üç dildeki sayfa adresi (dil geçişi bağlantıları için). */
  url: Record<Locale, string>;
  title: string;
  /** Kart sırasına göre fiyat (kuruş). */
  prices: number[];
  /** Kart sırasına göre durum: a = var, s = tükendi, h = bu şubede yok. */
  avail: string;
  /** Kart sırasına göre: 1 = ürün bazlı şube fiyatı (sabit fark / mutlak fiyat) → "Şube fiyatı" rozeti. */
  flags: string;
  /** Şube fiyat katmanı satırı (yerelleştirilmiş). */
  tier: string;
}

export interface ClientState {
  locale: Locale;
  /** Giriş sayfası mı (kök URL)? Kayıtlı şube/dil tercihi yalnızca burada uygulanır. */
  entry: boolean;
  branches: ClientBranch[];
  t: {
    openNow: string;
    closedNow: string;
    closedNoHours: string;
    tomorrow: string;
    today: string;
    hiddenHere: string;
    switched: string;
  };
}
