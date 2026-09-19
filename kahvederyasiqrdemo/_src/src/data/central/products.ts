/**
 * Merkez menü ürünleri.
 *
 * Ad, sıra ve görsel: markanın sitesinden çekilen veri (data/urunler.json, scripts/scrape-assets.ts).
 * Adlar AYNEN kullanılır — düzeltilmez, sadeleştirilmez, çevrilmez.
 * Fiyat: markanın sitesinde fiyat yayınlanmıyor → aşağıdaki tablonun TAMAMI örnektir.
 */
import scraped from "../../../data/urunler.json";
import type { Product } from "../schema";
import { categories } from "./categories";
import { tenant } from "./tenant";

/** TL, tek boy. Anahtar: scrape çıktısındaki slug. */
// TEYİT: Tüm fiyatlar örnek fiyattır (2026, TRY). Sitede fiyat yayınlanmıyor; gerçek fiyat listesi markadan alınmalı.
const PRICES_TL: Record<string, Record<string, number>> = {
  "sicak-icecekler": {
    "turk-kahvesi": 110, "sutlu-turk-kahvesi": 120, "osmanli-dibek-flavored": 125, "menengic-kahvesi": 125,
    "espresso": 100, "double-espresso": 125, "espresso-macchiato": 110, "double-espresso-macchiato": 135,
    "espresso-con-panna": 115, "double-espresso-con-panna": 140, "americano": 130, "cafe-latte": 155,
    "oreo-hot-coffee": 175, "cafe-mocha": 165, "white-chocolate-mocha": 170, "karamel-macchiato": 165,
    "cappuccino": 150, "latte-macchiato": 155, "hazir-kahve-sade": 95, "hazir-kahve-sutlu": 105,
    "kahve-deryasi-special": 185, "filtre-kahve": 130, "syphon": 190, "aeropress": 170,
    "pour-over-v60": 170, "chemex": 190, "salep": 140, "sicak-cikolata": 150, "beyaz-sicak-cikolata": 155,
  },
  "soguk-icecekler": {
    "cold-brew-kolali": 170, "cold-brew-sutlu": 165, "frappe": 175, "oreo-frappe": 190, "mocha-frappe": 185,
    "white-mocha-frappe": 190, "karamel-frappe": 185, "dondurmali-frappe": 195, "kahve-deryasi-frappe": 205,
    "buzlu-cikolata": 170, "buzlu-beyaz-cikolata": 175, "cikolatali-smoothie": 185, "beyaz-cikolatali-smoothie": 190,
    "cilek-limon-aski": 180, "dondurma-espresso-aski": 190, "visne-muz-aski": 180, "mavi-ruya": 175,
    "buzlu-hazir-kahve": 130, "buzlu-findikli": 175, "ice-americano": 140, "ice-cafe-latte": 160,
    "cilek-frozen": 165, "kavun-frozen": 165, "muz-frozen": 165, "nane-limon-frozen": 160,
    "cilek-milkshake": 180, "oreo-cikolata-milkshake": 190, "limon-milkshake": 175, "karadut-deryasi": 185,
  },
  "yemekler": {
    "yumurtali-ekmek": 220, "tatli-kahvalti-pancake": 260, "gevrek-kahvalti-hizli-kahvalti": 240, "kahvalti-tabagi": 420,
    "leb-i-derya-kahvalti": 650, "omlet": 210, "klasik-menemen": 230, "su-boregi": 220, "philly-steak": 460,
    "egeli-tost": 240, "anadolu-tost": 250, "club-sandwich": 380, "big-chicken": 390, "cheese-burger": 420,
    "klasik-usul-burger": 400, "karisik-pizza": 390, "ton-balikli-pizza": 410, "pastirmali-pizza": 430,
    "etli-wrap": 400, "ege-usulu-salata": 290, "hellim-salata": 320, "sezar-salata": 330, "ton-balikli-salata": 340,
    "steak-salata": 440, "penne-arabiatta": 310, "penne-al-fredo": 340, "spagetti-bolognese": 350,
    "fettucini-alfredo": 350, "kori-soslu-tavuk": 390, "tai-soslu-tavuk": 390, "pilic-sinitzel": 380,
    "tavuklu-fajita": 400, "chef-kofte": 450, "bodrum-cokertmesi": 520, "cafe-de-paris-soslu-bonfile": 690,
    "domi-glas-soslu-bonfile": 690, "beef-quesadilla": 440, "mexico-steak": 650, "patlican-begendili-bonfile": 710,
    "guvecte-et-sote": 560,
  },
  "pastalar": {
    "brownie": 190, "cikolatali-marlenka": 210, "devil-s-fudge": 220, "dondurma": 150, "fondu": 360,
    "franbuazli-cheesecake": 220, "havuclu-kek": 170, "kara-orman-pasta": 200, "klasik-marlenka": 200,
    "krokanli-pasta": 210, "molten-kek": 230, "mozaik-pasta": 170, "tiramisu": 220,
    "siyah-profiterollu-pasta": 210, "waffle": 280,
  },
};

/** Ürün kimliği slug'dan türetilir; override dosyaları bu kimliği kullanır. */
export const productId = (slug: string) => `prd_${slug.replace(/-/g, "_")}`;

export const products: Product[] = scraped.urunler.map((u): Product => {
  const category = categories.find((c) => c.slug === u.kategori);
  if (!category) throw new Error(`bilinmeyen kategori: ${u.kategori}`);
  const tl = PRICES_TL[u.kategori]?.[u.slug];
  if (tl === undefined) throw new Error(`fiyat yok: ${u.kategori}/${u.slug} (${u.ad})`);
  const id = productId(u.slug);
  return {
    id,
    tenant_id: tenant.id,
    branch_id: null,
    category_id: category.id,
    slug: u.slug,
    sort_order: (category.sort_order * 1000) + u.sira, // sitedeki sıra korunur
    name_i18n: { tr: u.ad },
    image_key: u.cikti.length ? `${u.kategori}/${u.slug}` : null,
    variants: [{ id: `${id}__tek`, product_id: id, sort_order: 1, label_i18n: null, price_minor: tl * 100 }],
  };
});

// Fiyat tablosunda scrape'te olmayan ürün kalmasın
for (const [cat, table] of Object.entries(PRICES_TL)) {
  for (const slug of Object.keys(table)) {
    if (!scraped.urunler.some((u) => u.kategori === cat && u.slug === slug)) throw new Error(`fiyat tablosunda fazlalık: ${cat}/${slug}`);
  }
}

/** Görsel genişlikleri: scrape çıktısında gerçekten var olanlar (büyütme yapılmadığı için 720w yok). */
export const imageWidths = (key: string): number[] => {
  const u = scraped.urunler.find((x) => `${x.kategori}/${x.slug}` === key);
  return u ? u.cikti.map((o) => o.w) : [];
};
