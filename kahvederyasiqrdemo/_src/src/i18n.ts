/**
 * Arayüz metinleri — TR / EN / AR.
 * Ürün ve şube adları burada değildir: onlar markanın kendi yazımıyla veriden gelir ve çevrilmez.
 * Demo ibareleri (strip, badge, heroCaption, pricesNote, branchesNote, rights) zorunludur; üç dilde de bulunur.
 */
import type { Locale } from "./data/schema";

export interface Strings {
  htmlLang: string;
  dir: "ltr" | "rtl";
  ogLocale: string;
  localeName: string;
  localeShort: string;

  title: string; // {branch}
  description: string;
  skip: string;
  qrMenu: string;

  // Zorunlu demo ibareleri
  demoBadge: string;
  demoBadgeTitle: string;
  heroCaption: string;
  strip: string;
  pricesNote: string;
  branchesNote: string;
  rights: string;

  langNav: string;
  branchLabel: string;
  branchChange: string;
  branchesTitle: string;
  scale: string; // {n}
  kind: { cafe: string; cafe_restaurant: string };
  openNow: string; // {t}
  closedNow: string; // {t}
  closedNoHours: string;
  tomorrow: string;
  today: string;
  hoursTitle: string;
  address: string;
  phone: string;
  call: string;
  switched: string; // {branch}

  menu: string;
  categoriesNav: string;
  soldOut: string;
  branchPrice: string;
  branchPriceTitle: string;
  hiddenHere: string; // {n}
  tier: string; // {sign} {n} — sayı LTR izolasyonunda (U+2066…U+2069): Arapçada "−5%" ters dönmesin
  tierCentral: string;

  compareTitle: string;
  compareLead: string;
  compareProduct: string;
  compareCentral: string;
  compareHidden: string;

  pitchEyebrow: string;
  pitchTitle: string; // {n}
  pitchLead: string;
  pitchItems: { title: string; body: string }[];
  techTitle: string;
  techLighthouse: string;
  techPerf: string;
  techA11y: string;
  techBp: string;
  techLcp: string;
  techWeight: string;
  techMethod: string; // {v} {date}
  cta: string;
}

const tr: Strings = {
  htmlLang: "tr",
  dir: "ltr",
  ogLocale: "tr_TR",
  localeName: "Türkçe",
  localeShort: "TR",

  title: "Kahve Deryası · QR Menü — {branch}",
  description: "Kahve Deryası için hazırlanmış franchise QR menü demosu: tek merkez menü, şube bazlı fiyat, stok ve çalışma saati, üç dil.",
  skip: "Menüye geç",
  qrMenu: "QR Menü",

  demoBadge: "DEMO",
  demoBadgeTitle: "Teklif amaçlı demo — onlinemenu-qr.com",
  heroCaption: "Temsilî görsel",
  strip: "Bu sayfa teklif amaçlı hazırlanmış bir demodur. Fiyatlar, şube bilgileri ve içerik gerçeği yansıtmaz.",
  pricesNote: "Fiyatlar örnektir",
  branchesNote: "Şube bilgileri örnektir.",
  rights: "Kahve Deryası markasına ait isim, logo ve ürün görselleri yalnızca bu teklif sunumu kapsamında kullanılmıştır. Tüm hakları marka sahibine aittir.",

  langNav: "Dil",
  branchLabel: "Şube",
  branchChange: "Şubeyi değiştir",
  branchesTitle: "Şubeler",
  scale: "Yurtiçinde {n} şube · bu demoda 6 temsilî şube",
  kind: { cafe: "Cafe", cafe_restaurant: "Cafe & Restaurant" },
  openNow: "Açık · kapanış {t}",
  closedNow: "Kapalı · açılış {t}",
  closedNoHours: "Kapalı",
  tomorrow: "yarın",
  today: "bugün",
  hoursTitle: "Çalışma saatleri",
  address: "Adres",
  phone: "Telefon",
  call: "Ara",
  switched: "{branch} menüsü gösteriliyor",

  menu: "Menü",
  categoriesNav: "Menü kategorileri",
  soldOut: "Tükendi",
  branchPrice: "Şube fiyatı",
  branchPriceTitle: "Bu şubenin fiyatı merkez fiyatından farklı",
  hiddenHere: "{n} ürün bu şubede sunulmuyor",
  tier: "Şube fiyat katmanı: merkez fiyatı \u2066{sign}%{n}\u2069",
  tierCentral: "Merkez fiyatları geçerli",

  compareTitle: "Aynı ürün, altı şube",
  compareLead: "Menü merkezde bir kez yazılır. Her şube yalnızca kendi farkını tanımlar: fiyat katmanı, tek ürün fiyatı, tükendi ya da sunulmuyor.",
  compareProduct: "Ürün",
  compareCentral: "Merkez",
  compareHidden: "Sunulmuyor",

  pitchEyebrow: "Franchise için",
  pitchTitle: "{n} şube, tek menü",
  pitchLead: "Marka dili her şubede birebir aynı kalır; şubeler yalnızca kendilerine ait olanı değiştirir.",
  pitchItems: [
    { title: "Merkezi menü yönetimi", body: "Ürün adı, görseli ve kategorisi merkezde bir kez düzenlenir; tüm şubelerde aynı anda yayına girer." },
    { title: "Şube bazlı fiyat, stok, saat", body: "Her şube kendi fiyat farkını, tükenen ürününü ve çalışma saatini girer. Merkez menü değişmez." },
    { title: "Üç dil", body: "Türkçe, İngilizce ve sağdan sola tam uyumlu Arapça. Misafir dilini tek dokunuşla seçer." },
    { title: "QR / NFC masa kartları", body: "Kart bir kez basılır. Fiyat ya da ürün değiştiğinde yeniden baskı gerekmez; güncelleme anında yayında." },
  ],
  techTitle: "Bu demonun kendi ölçümü",
  techLighthouse: "Lighthouse mobil",
  techPerf: "Performans",
  techA11y: "Erişilebilirlik",
  techBp: "En iyi uygulamalar",
  techLcp: "İlk açılış (LCP)",
  techWeight: "İlk yükleme",
  techMethod: "Lighthouse {v}, mobil öykünme ve yavaş 4G simülasyonu, {date}.",
  cta: "Teklif için: onlinemenu-qr.com",
};

const en: Strings = {
  htmlLang: "en",
  dir: "ltr",
  ogLocale: "en_GB",
  localeName: "English",
  localeShort: "EN",

  title: "Kahve Deryası · QR Menu — {branch}",
  description: "Franchise QR menu demo prepared for Kahve Deryası: one central menu, per-branch prices, stock and opening hours, three languages.",
  skip: "Skip to menu",
  qrMenu: "QR Menu",

  demoBadge: "DEMO",
  demoBadgeTitle: "Demo prepared for a proposal — onlinemenu-qr.com",
  heroCaption: "Representative image",
  strip: "This page is a demo prepared for a proposal. Prices, branch details and content do not reflect reality.",
  pricesNote: "Prices are examples",
  branchesNote: "Branch details are examples.",
  rights: "The Kahve Deryası name, logo and product images are used solely within the scope of this proposal. All rights belong to the brand owner.",

  langNav: "Language",
  branchLabel: "Branch",
  branchChange: "Change branch",
  branchesTitle: "Branches",
  scale: "{n} branches across Türkiye · 6 representative branches in this demo",
  kind: { cafe: "Cafe", cafe_restaurant: "Cafe & Restaurant" },
  openNow: "Open · closes {t}",
  closedNow: "Closed · opens {t}",
  closedNoHours: "Closed",
  tomorrow: "tomorrow",
  today: "today",
  hoursTitle: "Opening hours",
  address: "Address",
  phone: "Phone",
  call: "Call",
  switched: "Showing the {branch} menu",

  menu: "Menu",
  categoriesNav: "Menu categories",
  soldOut: "Sold out",
  branchPrice: "Branch price",
  branchPriceTitle: "This branch's price differs from the central price",
  hiddenHere: "{n} items are not offered at this branch",
  tier: "Branch price tier: central price \u2066{sign}{n}%\u2069",
  tierCentral: "Central prices apply",

  compareTitle: "One product, six branches",
  compareLead: "The menu is written once, centrally. Each branch defines only its own difference: a price tier, a single-item price, sold out or not offered.",
  compareProduct: "Product",
  compareCentral: "Central",
  compareHidden: "Not offered",

  pitchEyebrow: "For franchising",
  pitchTitle: "{n} branches, one menu",
  pitchLead: "The brand voice stays identical in every branch; branches change only what belongs to them.",
  pitchItems: [
    { title: "Central menu management", body: "Product names, images and categories are edited once, centrally, and go live in every branch at the same moment." },
    { title: "Per-branch price, stock and hours", body: "Each branch sets its own price difference, sold-out items and opening hours. The central menu stays untouched." },
    { title: "Three languages", body: "Turkish, English and fully right-to-left Arabic. Guests pick their language with a single tap." },
    { title: "QR / NFC table cards", body: "Cards are printed once. When a price or product changes, nothing is reprinted; the update is live instantly." },
  ],
  techTitle: "Measured on this demo",
  techLighthouse: "Lighthouse mobile",
  techPerf: "Performance",
  techA11y: "Accessibility",
  techBp: "Best practices",
  techLcp: "First load (LCP)",
  techWeight: "Initial load",
  techMethod: "Lighthouse {v}, mobile emulation with simulated slow 4G, {date}.",
  cta: "For the proposal: onlinemenu-qr.com",
};

const ar: Strings = {
  htmlLang: "ar",
  dir: "rtl",
  ogLocale: "ar_AR",
  localeName: "العربية",
  localeShort: "AR",

  title: "Kahve Deryası · قائمة QR — {branch}",
  description: "نموذج تجريبي لقائمة QR لامتياز Kahve Deryası: قائمة مركزية واحدة، وأسعار ومخزون وساعات عمل لكل فرع، وثلاث لغات.",
  skip: "الانتقال إلى القائمة",
  qrMenu: "قائمة QR",

  demoBadge: "نموذج تجريبي",
  demoBadgeTitle: "نموذج تجريبي أُعدّ لتقديم عرض — onlinemenu-qr.com",
  heroCaption: "صورة تمثيلية",
  strip: "هذه الصفحة نموذج تجريبي أُعدّ لغرض تقديم عرض. الأسعار ومعلومات الفروع والمحتوى لا تعكس الواقع.",
  pricesNote: "الأسعار أمثلة توضيحية",
  branchesNote: "معلومات الفروع أمثلة توضيحية.",
  rights: "استُخدم اسم Kahve Deryası وشعارها وصور منتجاتها في إطار هذا العرض فقط. جميع الحقوق محفوظة لمالك العلامة التجارية.",

  langNav: "اللغة",
  branchLabel: "الفرع",
  branchChange: "تغيير الفرع",
  branchesTitle: "الفروع",
  scale: "{n} فرعًا داخل تركيا · 6 فروع تمثيلية في هذا النموذج",
  kind: { cafe: "مقهى", cafe_restaurant: "مقهى ومطعم" },
  openNow: "مفتوح · يغلق {t}",
  closedNow: "مغلق · يفتح {t}",
  closedNoHours: "مغلق",
  tomorrow: "غدًا",
  today: "اليوم",
  hoursTitle: "ساعات العمل",
  address: "العنوان",
  phone: "الهاتف",
  call: "اتصال",
  switched: "تُعرض الآن قائمة {branch}",

  menu: "القائمة",
  categoriesNav: "أقسام القائمة",
  soldOut: "نفدت الكمية",
  branchPrice: "سعر الفرع",
  branchPriceTitle: "سعر هذا الفرع يختلف عن السعر المركزي",
  hiddenHere: "{n} منتجات غير متوفرة في هذا الفرع",
  tier: "الشريحة السعرية للفرع: السعر المركزي \u2066{sign}{n}%\u2069",
  tierCentral: "تُطبَّق الأسعار المركزية",

  compareTitle: "المنتج نفسه في ستة فروع",
  compareLead: "تُكتب القائمة مرة واحدة مركزيًا، ويحدد كل فرع اختلافه فقط: شريحة سعرية، أو سعر منتج بعينه، أو نفاد الكمية، أو عدم التوفر.",
  compareProduct: "المنتج",
  compareCentral: "المركز",
  compareHidden: "غير متوفر",

  pitchEyebrow: "لشبكة الامتياز",
  pitchTitle: "{n} فرعًا، قائمة واحدة",
  pitchLead: "تبقى هوية العلامة واحدة في كل فرع، ولا يغيّر كل فرع إلا ما يخصه.",
  pitchItems: [
    { title: "إدارة مركزية للقائمة", body: "تُحرَّر أسماء المنتجات وصورها وأقسامها مرة واحدة مركزيًا، وتُنشر في جميع الفروع في اللحظة نفسها." },
    { title: "سعر ومخزون وساعات لكل فرع", body: "يحدد كل فرع فرق السعر الخاص به والمنتجات النافدة وساعات العمل، دون المساس بالقائمة المركزية." },
    { title: "ثلاث لغات", body: "التركية والإنجليزية والعربية مع دعم كامل للكتابة من اليمين إلى اليسار. يختار الضيف لغته بلمسة واحدة." },
    { title: "بطاقات طاولة QR / NFC", body: "تُطبع البطاقة مرة واحدة. عند تغيّر سعر أو منتج لا حاجة لإعادة الطباعة؛ يُنشر التحديث فورًا." },
  ],
  techTitle: "قياسات هذا النموذج نفسه",
  techLighthouse: "Lighthouse للجوال",
  techPerf: "الأداء",
  techA11y: "إمكانية الوصول",
  techBp: "أفضل الممارسات",
  techLcp: "التحميل الأول (LCP)",
  techWeight: "حجم التحميل الأول",
  techMethod: "Lighthouse {v}، محاكاة جوال مع شبكة 4G بطيئة، {date}.",
  cta: "للعرض: onlinemenu-qr.com",
};

export const strings: Record<Locale, Strings> = { tr, en, ar };

export const fill = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
