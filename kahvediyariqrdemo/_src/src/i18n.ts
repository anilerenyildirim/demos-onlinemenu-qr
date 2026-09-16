/**
 * Arayüz metinleri. Ton iç mekân tabelalarından: kısa, samimi, "sen" dili.
 * Menü içeriği (ürün/kategori) veride; burada yalnızca arayüz.
 */
import type { AllergenCode, Locale, ProductTag } from "./data/schema";

const tr = {
  htmlLang: "tr",
  otherLocaleLabel: "English",
  localeShort: { tr: "TR", en: "EN" },
  langNav: "Dil",
  demoBadge: "Demo",
  demoBadgeTitle: "onlinemenu-qr.com tarafından hazırlanmış demo",
  sampleNotice: "Örnek şube",

  // Giriş
  entryTitle: "Kahve Diyarı · Şubeni seç",
  entryDescription: "Kahve Diyarı QR menü demosu: şubeni seç, o şubenin menüsü açılsın.",
  entryBubble: "Menün şubene göre açılır",
  entryHeading: "Hangi şubedesin?",
  entryLead: "Masadaki QR kod seni doğrudan şubenin menüsüne götürür. Burada QR'ı okutmuş gibi şubeni seçebilirsin.",
  branchSearchLabel: "Şube ara",
  branchSearchPlaceholder: "Şube adı ya da tipi: kampüs, AVM…",
  branchNone: "Bu aramayla eşleşen şube yok. Şube adının bir kısmını yazmayı dene.",
  continueLast: "Kaldığın şubeden devam et",
  qrTarget: "QR adresi",
  heroAlt: "Kahve Diyarı şubesinin içi: koyu teal çıtalı tezgâh, siyah metro fayans, mermer masalar ve sıcak spot ışıklar",

  // Menü
  menuTitle: (branch: string) => `${branch} · Kahve Diyarı Menü`,
  menuDescription: (branch: string) => `Kahve Diyarı ${branch} menüsü: kahveler, çaylar, tatlılar ve paket kahveler.`,
  changeBranch: "Şube değiştir",
  skipToMenu: "Menüye geç",
  categoriesNav: "Kategoriler",
  searchLabel: "Menüde ara",
  searchPlaceholder: "Menüde ara: latte, cheesecake…",
  searchClear: "Aramayı temizle",
  searchCount: (n: number) => `${n} ürün bulundu`,
  searchNone: (q: string) => `“${q}” için bir şey bulamadık. Başka bir kelime dene ya da kategorilere göz at.`,
  pricesNote: "Fiyatlar örnektir.",
  allergenNote: "Alerjen ve içerik bilgisi için kasaya sorabilirsin.",
  allergensLabel: "Alerjen",
  soldOut: "Tükendi",
  soldOutHint: "Bugünlük tükendi",

  // Franchise görünümü
  fxToggle: "Şube farklarını göster",
  fxToggleHint: "Merkez menüden bu şubede neyin değiştiğini işaretler.",
  fxHiddenHere: "Bu şubede yok",
  fxBranchOnly: "Bu şubeye özel",
  fxCentral: (price: string) => `Merkez ${price}`,
  fxSource: {
    branch_pct: (pct: number) => `şube fiyat katmanı ${pct > 0 ? "+" : ""}${pct}%`,
    branch_delta: "şube fiyat farkı",
    branch_fixed: "şube fiyatı",
  },
  fxSummary: (n: { price: number; soldOut: number; hidden: number; only: number }) =>
    `Bu şubede merkez menüye göre ${n.price} fiyat farkı, ${n.soldOut} tükenen, ${n.hidden} sunulmayan ve ${n.only} şubeye özel ürün var.`,

  // Şube bilgisi
  branchInfoHeading: "Şube bilgisi",
  hoursHeading: "Çalışma saatleri",
  closedDay: "Kapalı",
  today: "Bugün",
  openNow: (closes: string) => `Şu an açık · Kapanış ${closes}`,
  closedNow: (when: string) => `Şu an kapalı · Açılış ${when}`,
  closedNoHours: "Şu an kapalı",
  tomorrow: "yarın",
  addressHeading: "Adres",
  phoneHeading: "Telefon",
  howToOrder: "Sipariş nasıl verilir?",
  weekdays: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],

  // Franchise bölümü
  offerHeading: "Franchise için neler sunuyoruz",
  offerLead: "Bu demo tek bir menü kaynağından dört farklı örnek şube üretir.",
  offerItems: [
    ["Merkezi menü", "Ürün, fotoğraf ve açıklamaları merkez bir kez girer; tüm şubelerde aynı anda güncellenir."],
    ["Şube bazlı fiyat ve stok", "Her şube kendi fiyat farkını, tükenen ve sunmadığı ürünü kendisi işaretler."],
    ["Çoklu dil", "Aynı menü Türkçe ve İngilizce açılır; yeni dil eklemek yalnızca çeviri girmek demek."],
    ["QR ve NFC masa kartları", "Her masa kartı kendi şubesinin menüsüne gider; menü değişse de kart aynı kalır."],
  ] as [string, string][],
  compareHeading: "Aynı ürün, dört şube",
  compareCaption: "Demo verisinde bilerek farklı bırakılan örnekler.",
  compareProduct: "Ürün",
  compareHidden: "Yok",
  thisBranch: "bu şube",
  footerDemo: "Bu sayfa onlinemenu-qr.com tarafından hazırlanmış bir demodur. Şube, ürün ve fiyat bilgileri örnektir; Kahve Diyarı'nın gerçek menüsünü yansıtmaz.",
  footerBack: "Şube seçimine dön",

  tags: { new: "Yeni", seasonal: "Sezonluk", vegan: "Vegan" } satisfies Record<ProductTag, string>,
  allergens: {
    gluten: "Gluten", crustaceans: "Kabuklular", eggs: "Yumurta", fish: "Balık", peanuts: "Yer fıstığı",
    soy: "Soya", milk: "Süt", nuts: "Sert kabuklu yemiş", celery: "Kereviz", mustard: "Hardal",
    sesame: "Susam", sulphites: "Sülfit", lupin: "Acı bakla", molluscs: "Yumuşakçalar",
  } satisfies Record<AllergenCode, string>,
};

export type Strings = typeof tr;

const en: Strings = {
  htmlLang: "en",
  otherLocaleLabel: "Türkçe",
  localeShort: { tr: "TR", en: "EN" },
  langNav: "Language",
  demoBadge: "Demo",
  demoBadgeTitle: "Demo prepared by onlinemenu-qr.com",
  sampleNotice: "Sample branch",

  entryTitle: "Kahve Diyarı · Choose your branch",
  entryDescription: "Kahve Diyarı QR menu demo: pick a branch and its own menu opens.",
  entryBubble: "Your menu opens for your branch",
  entryHeading: "Which branch are you at?",
  entryLead: "The QR code on your table takes you straight to that branch's menu. Pick a branch here as if you had scanned it.",
  branchSearchLabel: "Search branches",
  branchSearchPlaceholder: "Branch name or type: campus, mall…",
  branchNone: "No branch matches that search. Try part of the branch name.",
  continueLast: "Continue with your last branch",
  qrTarget: "QR link",
  heroAlt: "Inside a Kahve Diyarı branch: dark teal fluted counter, black subway tiles, marble tables and warm spotlights",

  menuTitle: (branch: string) => `${branch} · Kahve Diyarı Menu`,
  menuDescription: (branch: string) => `Kahve Diyarı ${branch} menu: coffee, tea, cakes and coffee to take home.`,
  changeBranch: "Change branch",
  skipToMenu: "Skip to menu",
  categoriesNav: "Categories",
  searchLabel: "Search the menu",
  searchPlaceholder: "Search the menu: latte, cheesecake…",
  searchClear: "Clear search",
  searchCount: (n: number) => `${n} ${n === 1 ? "item" : "items"} found`,
  searchNone: (q: string) => `Nothing found for “${q}”. Try another word or browse the categories.`,
  pricesNote: "Prices are examples.",
  allergenNote: "Ask at the counter for allergen and ingredient details.",
  allergensLabel: "Allergens",
  soldOut: "Sold out",
  soldOutHint: "Sold out for today",

  fxToggle: "Show branch differences",
  fxToggleHint: "Highlights what this branch changes from the central menu.",
  fxHiddenHere: "Not at this branch",
  fxBranchOnly: "Only at this branch",
  fxCentral: (price: string) => `Central ${price}`,
  fxSource: {
    branch_pct: (pct: number) => `branch price tier ${pct > 0 ? "+" : ""}${pct}%`,
    branch_delta: "branch price difference",
    branch_fixed: "branch price",
  },
  fxSummary: (n) =>
    `Compared with the central menu, this branch has ${n.price} price changes, ${n.soldOut} sold out, ${n.hidden} not offered and ${n.only} branch-only items.`,

  branchInfoHeading: "Branch info",
  hoursHeading: "Opening hours",
  closedDay: "Closed",
  today: "Today",
  openNow: (closes: string) => `Open now · Closes ${closes}`,
  closedNow: (when: string) => `Closed now · Opens ${when}`,
  closedNoHours: "Closed now",
  tomorrow: "tomorrow",
  addressHeading: "Address",
  phoneHeading: "Phone",
  howToOrder: "How to order",
  weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],

  offerHeading: "What we offer franchises",
  offerLead: "This demo builds four sample branches from a single menu source.",
  offerItems: [
    ["Central menu", "Head office enters products, photos and descriptions once; every branch updates at the same time."],
    ["Branch pricing and stock", "Each branch sets its own price difference and marks what is sold out or not offered."],
    ["Multiple languages", "The same menu opens in Turkish and English; adding a language is just adding translations."],
    ["QR and NFC table cards", "Each table card opens its own branch's menu; the card stays the same when the menu changes."],
  ],
  compareHeading: "Same product, four branches",
  compareCaption: "Differences deliberately built into the demo data.",
  compareProduct: "Product",
  compareHidden: "Not here",
  thisBranch: "this branch",
  footerDemo: "This page is a demo prepared by onlinemenu-qr.com. Branch, product and price details are examples and do not reflect Kahve Diyarı's actual menu.",
  footerBack: "Back to branch selection",

  tags: { new: "New", seasonal: "Seasonal", vegan: "Vegan" },
  allergens: {
    gluten: "Gluten", crustaceans: "Crustaceans", eggs: "Eggs", fish: "Fish", peanuts: "Peanuts",
    soy: "Soy", milk: "Milk", nuts: "Tree nuts", celery: "Celery", mustard: "Mustard",
    sesame: "Sesame", sulphites: "Sulphites", lupin: "Lupin", molluscs: "Molluscs",
  },
};

export const strings: Record<Locale, Strings> = { tr, en };

export function formatPrice(minor: number, locale: Locale): string {
  const n = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
  return `₺${n}`;
}
