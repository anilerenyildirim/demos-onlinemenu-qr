/**
 * Merkez menü — tüm şubelerde ortak ürün, açıklama ve merkez fiyatları.
 * Şube farkları burada DEĞİL, ../branches/* dosyalarında tutulur.
 *
 * TEYİT: Kahve Diyarı'nın gerçek menüsü bilinmiyor. Aşağıdaki tüm ürün adları, açıklamalar,
 * alerjenler ve fiyatlar demo amaçlı örnektir; her satır ayrıca işaretlenmiştir.
 */
import type { AllergenCode, LocalizedText, Product, ProductTag, ProductVariant } from "../schema";

const T = "tnt_kahvediyari";

const SIZE = {
  s: { tr: "Küçük", en: "Small" },
  m: { tr: "Orta", en: "Medium" },
  l: { tr: "Büyük", en: "Large" },
  g200: { tr: "200 g", en: "200 g" },
  g250: { tr: "250 g", en: "250 g" },
  g1000: { tr: "1 kg", en: "1 kg" },
} satisfies Record<string, LocalizedText>;

type VariantSpec = [keyof typeof SIZE | null, number /* ₺ */];

interface Spec {
  id: string;
  category: string;
  name: LocalizedText;
  desc: LocalizedText;
  variants: VariantSpec[];
  tags?: ProductTag[];
  allergens?: AllergenCode[];
}

/** Okunaklı spec → D1 satırı biçiminde Product. Varyant kimlikleri `<product_id>__<boy>` olarak türetilir. */
export function defineProducts(specs: Spec[], branch_id: string | null = null): Product[] {
  const order = new Map<string, number>();
  return specs.map((s) => {
    const sort_order = (order.get(s.category) ?? 0) + 1;
    order.set(s.category, sort_order);
    const variants: ProductVariant[] = s.variants.map(([size, lira], i) => ({
      id: `${s.id}__${size ?? "tek"}`,
      product_id: s.id,
      sort_order: i + 1,
      label_i18n: size ? SIZE[size] : null,
      price_minor: lira * 100,
    }));
    return {
      id: s.id,
      tenant_id: T,
      branch_id,
      category_id: s.category,
      slug: s.id.replace(/^prd_/, "").replaceAll("_", "-"),
      sort_order: branch_id ? 100 + sort_order : sort_order,
      name_i18n: s.name,
      description_i18n: s.desc,
      image_key: null,
      tags: s.tags ?? [],
      allergens: s.allergens ?? [],
      variants,
    };
  });
}

export const products: Product[] = defineProducts([
  // ── Sıcak kahveler ──────────────────────────────────────────────────────
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_espresso", category: "cat_sicak_kahve",
    name: { tr: "Espresso", en: "Espresso" },
    desc: { tr: "Ev harmanından tek shot, kısa ve yoğun.", en: "A single shot of our house blend, short and intense." },
    variants: [[null, 70]],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_americano", category: "cat_sicak_kahve",
    name: { tr: "Americano", en: "Americano" },
    desc: { tr: "Sıcak suyla uzatılmış espresso.", en: "Espresso lengthened with hot water." },
    variants: [["s", 95], ["m", 110], ["l", 125]],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_latte", category: "cat_sicak_kahve",
    name: { tr: "Latte", en: "Latte" },
    desc: { tr: "Espresso üzerine bol, ipeksi sıcak süt.", en: "Espresso topped with plenty of silky steamed milk." },
    variants: [["s", 110], ["m", 125], ["l", 140]],
    allergens: ["milk"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_cappuccino", category: "cat_sicak_kahve",
    name: { tr: "Cappuccino", en: "Cappuccino" },
    desc: { tr: "Espresso, sıcak süt ve kalın köpük eşit ölçüde.", en: "Equal parts espresso, steamed milk and thick foam." },
    variants: [["s", 110], ["m", 125], ["l", 140]],
    allergens: ["milk"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_flat_white", category: "cat_sicak_kahve",
    name: { tr: "Flat White", en: "Flat White" },
    desc: { tr: "Çift ristretto ve ince dokulu süt. Kahve tadı önde.", en: "Double ristretto with velvety milk. Coffee-forward." },
    variants: [[null, 125]],
    allergens: ["milk"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_filtre", category: "cat_sicak_kahve",
    name: { tr: "Filtre kahve", en: "Filter coffee" },
    desc: { tr: "Günün demlemesi. Yanına sıcak süt isteyebilirsin.", en: "Today's brew. Ask for warm milk on the side." },
    variants: [["s", 85], ["m", 95], ["l", 105]],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_turk_kahvesi", category: "cat_sicak_kahve",
    name: { tr: "Türk kahvesi", en: "Turkish coffee" },
    desc: { tr: "Közde pişmiş gibi köpüklü, yanında su ve lokum.", en: "Foamy and slow-brewed, served with water and Turkish delight." },
    variants: [[null, 80]],
  },

  // ── Soğuk kahveler ──────────────────────────────────────────────────────
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_iced_latte", category: "cat_soguk_kahve",
    name: { tr: "Iced Latte", en: "Iced Latte" },
    desc: { tr: "Buz, soğuk süt ve üstüne espresso.", en: "Ice, cold milk and a shot of espresso on top." },
    variants: [["s", 125], ["m", 140], ["l", 155]],
    allergens: ["milk"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_iced_americano", category: "cat_soguk_kahve",
    name: { tr: "Iced Americano", en: "Iced Americano" },
    desc: { tr: "Buz gibi su ve espresso. Sade ve ferah.", en: "Espresso over ice-cold water. Clean and refreshing." },
    variants: [["s", 105], ["m", 120], ["l", 135]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_cold_brew", category: "cat_soguk_kahve",
    name: { tr: "Cold Brew", en: "Cold Brew" },
    desc: { tr: "18 saat soğuk demlenir; yumuşak, az asidik.", en: "Steeped cold for 18 hours; smooth and low in acidity." },
    variants: [["m", 130], ["l", 145]],
    tags: ["new", "vegan"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_espresso_tonik", category: "cat_soguk_kahve",
    name: { tr: "Espresso Tonik", en: "Espresso Tonic" },
    desc: { tr: "Tonik, buz ve portakal kabuğu üstüne espresso.", en: "Espresso over tonic, ice and orange peel." },
    variants: [[null, 135]],
    tags: ["new", "vegan"],
  },

  // ── Çaylar ve sıcaklar ─────────────────────────────────────────────────
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_cay", category: "cat_cay_sicak",
    name: { tr: "Çay", en: "Turkish tea" },
    desc: { tr: "Taze demlenmiş, ince belli bardakta.", en: "Freshly brewed, served in a tulip glass." },
    variants: [[null, 35]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_chai_latte", category: "cat_cay_sicak",
    name: { tr: "Chai Latte", en: "Chai Latte" },
    desc: { tr: "Tarçın, kakule ve zencefilli baharatlı çay, sıcak sütle.", en: "Spiced tea with cinnamon, cardamom and ginger, with steamed milk." },
    variants: [["m", 115], ["l", 130]],
    allergens: ["milk"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_sicak_cikolata", category: "cat_cay_sicak",
    name: { tr: "Sıcak çikolata", en: "Hot chocolate" },
    desc: { tr: "Bitter çikolata ve sıcak süt, üstü kakaolu.", en: "Dark chocolate and steamed milk, dusted with cocoa." },
    variants: [["m", 110], ["l", 125]],
    allergens: ["milk", "soy"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_sahlep", category: "cat_cay_sicak",
    name: { tr: "Sahlep", en: "Salep" },
    desc: { tr: "Kış aylarına özel; tarçın ve fındık kırığıyla.", en: "Winter special, with cinnamon and crushed hazelnuts." },
    variants: [[null, 120]],
    tags: ["seasonal"],
    allergens: ["milk", "nuts"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_bitki_cayi", category: "cat_cay_sicak",
    name: { tr: "Bitki çayı", en: "Herbal tea" },
    desc: { tr: "Ihlamur, adaçayı ya da nane-limon. Seçimini kasada söyle.", en: "Linden, sage or mint-lemon. Tell us your pick at the counter." },
    variants: [[null, 80]],
    tags: ["vegan"],
  },

  // ── Soğuk içecekler ─────────────────────────────────────────────────────
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_limonata", category: "cat_soguk_icecek",
    name: { tr: "Ev yapımı limonata", en: "Homemade lemonade" },
    desc: { tr: "Taze sıkılmış limon ve nane.", en: "Freshly squeezed lemons with mint." },
    variants: [[null, 95]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_mango_frozen", category: "cat_soguk_icecek",
    name: { tr: "Mango frozen", en: "Mango frozen" },
    desc: { tr: "Mango ve buz, meyve püresiyle blend.", en: "Mango and ice blended with fruit purée." },
    variants: [["m", 130], ["l", 145]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, fiyat örnek
    id: "prd_soda", category: "cat_soguk_icecek",
    name: { tr: "Maden suyu", en: "Sparkling water" },
    desc: { tr: "Sade ya da limonlu.", en: "Plain or with lemon." },
    variants: [[null, 40]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, fiyat örnek
    id: "prd_su", category: "cat_soguk_icecek",
    name: { tr: "Su", en: "Still water" },
    desc: { tr: "50 cl.", en: "50 cl." },
    variants: [[null, 20]],
    tags: ["vegan"],
  },

  // ── Tatlılar ve pastane ─────────────────────────────────────────────────
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_cheesecake", category: "cat_tatli",
    name: { tr: "San Sebastian cheesecake", en: "San Sebastián cheesecake" },
    desc: { tr: "Üstü yanık, içi kremamsı. Dilim.", en: "Burnt top, creamy centre. Per slice." },
    variants: [[null, 185]],
    allergens: ["milk", "eggs", "gluten"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_brownie", category: "cat_tatli",
    name: { tr: "Cevizli brownie", en: "Walnut brownie" },
    desc: { tr: "Yoğun kakao, bol ceviz. İstersen ısıtalım.", en: "Rich cocoa and plenty of walnuts. We can warm it up." },
    variants: [[null, 140]],
    allergens: ["gluten", "milk", "eggs", "nuts"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_kruvasan", category: "cat_tatli",
    name: { tr: "Tereyağlı kruvasan", en: "Butter croissant" },
    desc: { tr: "Kat kat, çıtır; her sabah fırından.", en: "Flaky and crisp, baked every morning." },
    variants: [[null, 95]],
    allergens: ["gluten", "milk", "eggs"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_tarcinli_rulo", category: "cat_tatli",
    name: { tr: "Tarçınlı rulo", en: "Cinnamon roll" },
    desc: { tr: "Yumuşak hamur, tarçın ve hafif krema.", en: "Soft dough, cinnamon and a light glaze." },
    variants: [[null, 110]],
    allergens: ["gluten", "milk", "eggs"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_havuclu_kek", category: "cat_tatli",
    name: { tr: "Vegan havuçlu kek", en: "Vegan carrot cake" },
    desc: { tr: "Havuç, tarçın ve ceviz; hayvansal ürün yok.", en: "Carrot, cinnamon and walnuts, no animal products." },
    variants: [[null, 130]],
    tags: ["vegan"],
    allergens: ["gluten", "nuts"],
  },

  // ── Atıştırmalık ────────────────────────────────────────────────────────
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_kasarli_tost", category: "cat_atistirmalik",
    name: { tr: "Kaşarlı tost", en: "Cheese toastie" },
    desc: { tr: "Ekşi mayalı ekmek, bol kaşar.", en: "Sourdough bread with plenty of kashar cheese." },
    variants: [[null, 150]],
    allergens: ["gluten", "milk"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_hindi_sandvic", category: "cat_atistirmalik",
    name: { tr: "Hindi füme sandviç", en: "Smoked turkey sandwich" },
    desc: { tr: "Hindi füme, cheddar, roka ve hardallı sos.", en: "Smoked turkey, cheddar, rocket and mustard sauce." },
    variants: [[null, 185]],
    allergens: ["gluten", "milk", "mustard", "eggs"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_humus_wrap", category: "cat_atistirmalik",
    name: { tr: "Humuslu sebze wrap", en: "Hummus veggie wrap" },
    desc: { tr: "Humus, közlenmiş sebze ve yeşillik.", en: "Hummus, roasted vegetables and greens." },
    variants: [[null, 170]],
    tags: ["vegan"],
    allergens: ["gluten", "sesame"],
  },
  { // TEYİT: ad, açıklama, alerjen, fiyat örnek
    id: "prd_granola", category: "cat_atistirmalik",
    name: { tr: "Yoğurtlu granola kase", en: "Yogurt granola bowl" },
    desc: { tr: "Süzme yoğurt, ev yapımı granola ve mevsim meyvesi.", en: "Strained yogurt, homemade granola and seasonal fruit." },
    variants: [[null, 160]],
    allergens: ["milk", "gluten", "nuts"],
  },

  // ── Paket çekirdek ve filtre kahve ──────────────────────────────────────
  { // TEYİT: ürün adı/harman adı, açıklama, fiyat örnek
    id: "prd_ev_harmani", category: "cat_paket",
    name: { tr: "Ev harmanı çekirdek", en: "House blend beans" },
    desc: { tr: "Espresso ve filtre için dengeli, çikolatamsı harman.", en: "A balanced, chocolatey blend for espresso and filter." },
    variants: [["g250", 390], ["g1000", 1350]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_filtre_paket", category: "cat_paket",
    name: { tr: "Öğütülmüş filtre kahve", en: "Ground filter coffee" },
    desc: { tr: "Filtre makinesine ve French press'e uygun öğütüm.", en: "Ground for drip machines and French press." },
    variants: [["g250", 360]],
    tags: ["vegan"],
  },
  { // TEYİT: ad, açıklama, fiyat örnek
    id: "prd_turk_kahvesi_paket", category: "cat_paket",
    name: { tr: "Türk kahvesi", en: "Turkish coffee, ground" },
    desc: { tr: "Taze kavrulmuş, ince öğütülmüş.", en: "Freshly roasted, finely ground." },
    variants: [["g200", 220]],
    tags: ["vegan"],
  },
  { // TEYİT: ad (köken), açıklama, fiyat örnek
    id: "prd_tek_koken", category: "cat_paket",
    name: { tr: "Tek köken: Etiyopya", en: "Single origin: Ethiopia" },
    desc: { tr: "Çiçeksi ve narenciye notaları. Sınırlı parti.", en: "Floral with citrus notes. Limited lot." },
    variants: [["g250", 480]],
    tags: ["seasonal", "vegan"],
  },
]);
