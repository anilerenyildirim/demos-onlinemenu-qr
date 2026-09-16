import type { Category } from "../schema";

const T = "tnt_kahvediyari";

// TEYİT: Kategori yapısı demo için önerildi; markanın gerçek menü kırılımı bilinmiyor.
export const categories: Category[] = [
  {
    id: "cat_sicak_kahve", tenant_id: T, slug: "sicak-kahveler", sort_order: 1, icon: "hot",
    name_i18n: { tr: "Sıcak kahveler", en: "Hot coffee" },
    description_i18n: null,
  },
  {
    id: "cat_soguk_kahve", tenant_id: T, slug: "soguk-kahveler", sort_order: 2, icon: "iced",
    name_i18n: { tr: "Soğuk kahveler", en: "Iced coffee" },
    description_i18n: null,
  },
  {
    id: "cat_cay_sicak", tenant_id: T, slug: "caylar-sicaklar", sort_order: 3, icon: "tea",
    name_i18n: { tr: "Çaylar ve sıcaklar", en: "Tea & warm drinks" },
    description_i18n: null,
  },
  {
    id: "cat_soguk_icecek", tenant_id: T, slug: "soguk-icecekler", sort_order: 4, icon: "cold",
    name_i18n: { tr: "Soğuk içecekler", en: "Cold drinks" },
    description_i18n: { tr: "Self servis dolabından da alabilirsin.", en: "You can also grab these from the self-service fridge." },
  },
  {
    id: "cat_tatli", tenant_id: T, slug: "tatlilar-pastane", sort_order: 5, icon: "pastry",
    name_i18n: { tr: "Tatlılar ve pastane", en: "Cakes & pastries" },
    description_i18n: null,
  },
  {
    id: "cat_atistirmalik", tenant_id: T, slug: "atistirmalik", sort_order: 6, icon: "snack",
    name_i18n: { tr: "Atıştırmalık", en: "Snacks" },
    description_i18n: null,
  },
  {
    id: "cat_paket", tenant_id: T, slug: "paket-kahve", sort_order: 7, icon: "beans",
    name_i18n: { tr: "Paket çekirdek ve filtre kahve", en: "Coffee to take home" },
    description_i18n: { tr: "Raflardaki paketler. İstersen çekirdeği senin için öğütürüz.", en: "Bags from our shelves. We can grind the beans for you." },
  },
];
