# Veri şeması — panel.onlinemenu-qr.com (multi-tenant D1) uyumu

> **TEYİT:** Bu demo hazırlanırken panelin gerçek D1 şeması erişilebilir değildi. Aşağıdaki tablo ve alan adları
> panelin tenant → branch mantığına göre **önerilmiştir**; bağlamadan önce panel migration'larıyla karşılaştırılmalı.
> Kaynak veri okunaklı JSON'dur (`data/menu.json`, `data/branches.json`); `src/data/load.ts` onu bu tablolardaki satır
> biçimine çevirir (TS tipleri: `src/data/schema.ts`). Çekirdek, kardeş demolarla (kahvediyariqrdemo, kahvederyasiqrdemo)
> aynıdır; farklar aşağıda.
>
> Franchise'a özel panel gereksinimleri (merkezi katalog yayını, şube yetki kuralları, kampanya hedefleme, marka
> teması, şube şablonu) panel ekibinin iç dokümanında tutulur.

## Katmanlar

```
tenants ──┬── brands                                          ← Coffee House, Coffee Art (tema, logo)
          ├── categories ── products (branch_id NULL) ── product_variants ── product_variant_prices (currency)
          │                     ▲
          └── branches ──┬──────┘ products (branch_id = şube)   ← şubeye özel ürün (Dubai: Karak Chai)
                         ├── branch_product_overrides           ← stok, bu şubede yok, şube/kampanya fiyatı
                         └── branch_hours
```

- **Merkez** yalnızca `brands`, `categories`, `products (branch_id IS NULL)`, `product_variants`,
  `product_variant_prices` yazar.
- **Şube** yalnızca kendi `branch_*` satırlarını ve `branch_id` = kendisi olan ürünleri yazar (hangi alanları
  yazabileceği franchise yetki kurallarına bağlanır — panel gereksinimleri dokümanı).
- Tüm tablolar `tenant_id` taşır (satır düzeyinde kiracı izolasyonu, tek D1 veritabanı).

## Önerilen DDL (SQLite / D1)

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  default_locale TEXT NOT NULL, locales TEXT NOT NULL,          -- JSON ["tr","en","ar","ru"]
  menu_version TEXT NOT NULL,                                   -- yayınlanan katalog sürümü (ör. 2026-09-29.1)
  rounding_minor TEXT NOT NULL                                  -- JSON {"TRY":500,"AED":100,"KGS":1000}
);

CREATE TABLE brands (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL, name TEXT NOT NULL,
  logo_key TEXT,                                                -- R2 anahtarı
  theme TEXT NOT NULL,                                          -- JSON {"brand":"#4A8CC8","ink":"#151515",…}
  UNIQUE (tenant_id, slug)
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL, sort_order INTEGER NOT NULL, icon TEXT NOT NULL,
  name_i18n TEXT NOT NULL,                                      -- JSON {"tr":"…","en":"…","ar":"…","ru":"…"}
  UNIQUE (tenant_id, slug)
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  brand_id TEXT NOT NULL REFERENCES brands(id),
  slug TEXT NOT NULL,                                           -- QR adresi: /menu/<slug>/
  name_i18n TEXT NOT NULL, city_i18n TEXT NOT NULL, address_i18n TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('TRY','AED','KGS')),
  price_adjust_pct REAL NOT NULL DEFAULT 0,                     -- bölgesel katman, merkez fiyatına
  default_locale TEXT NOT NULL,                                 -- QR'ın açtığı dil
  locales TEXT NOT NULL,                                        -- JSON — şubede açık diller
  timezone TEXT NOT NULL,                                       -- Europe/Istanbul, Asia/Dubai, Asia/Bishkek
  UNIQUE (tenant_id, slug)
);

CREATE TABLE products (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  branch_id TEXT REFERENCES branches(id),                       -- NULL = merkez ürünü
  category_id TEXT NOT NULL REFERENCES categories(id),
  slug TEXT NOT NULL, sort_order INTEGER NOT NULL,
  name_i18n TEXT NOT NULL, description_i18n TEXT NOT NULL,
  image_key TEXT,                                               -- R2: "urun-<slug>" → -176/-352/-640 .avif/.webp
  tags TEXT NOT NULL DEFAULT '[]',                              -- JSON ["new"] — ağ geneli etiket
  allergens TEXT NOT NULL DEFAULT '[]'                          -- JSON, AB 14 alerjen kodu
);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('one','s','m','l','single','double'))  -- sabit boy sözlüğü (ml, etiket)
);

-- Her para birimi ayrı fiyat listesidir; kur çevrimi yapılmaz (Dubai fiyatı TRY'den türetilmez)
CREATE TABLE product_variant_prices (
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  currency TEXT NOT NULL, price_minor INTEGER NOT NULL,         -- en küçük birim (kuruş / fils / tyiyn)
  PRIMARY KEY (variant_id, currency)
);

CREATE TABLE branch_product_overrides (
  branch_id TEXT NOT NULL REFERENCES branches(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  availability TEXT CHECK (availability IN ('available','sold_out','hidden')),
  campaign INTEGER NOT NULL DEFAULT 0,                          -- 1 → "Kampanya" rozeti; variant_prices kampanya fiyatı
  variant_prices TEXT,                                          -- JSON [{variant_id, price_minor}] — şubenin para biriminde
  PRIMARY KEY (branch_id, product_id)
);

CREATE TABLE branch_hours (
  branch_id TEXT NOT NULL REFERENCES branches(id),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),     -- ISO; kapalı gün satırı yok
  opens TEXT NOT NULL, closes TEXT NOT NULL,                    -- "HH:MM"; closes <= opens → ertesi gün
  PRIMARY KEY (branch_id, weekday)
);
```

Kardeş demolardan farklar: `brands` tablosu (aynı katalog, iki marka kimliği), para birimi başına
`product_variant_prices`, `branches.currency / default_locale / locales / timezone`, kampanya bayrağı, dört dil.

## Fiyat çözümleme sırası (`src/data/resolve.ts`)

Her varyant için, **şubenin para biriminde**:

1. Merkez fiyat listesi (`product_variant_prices`, `currency = branches.currency`) — yoksa build düşer
2. Şube yüzde katmanı `price_adjust_pct` → `tenants.rounding_minor[currency]` adımına yuvarlanır
   (yalnızca merkez ürünlerine; şubeye özel ürünün fiyatı zaten şube fiyatıdır)
3. Varyant bazlı mutlak şube fiyatı `variant_prices` — öncekileri ezer. `campaign = 1` ise kampanya fiyatıdır ve
   2. adımın sonucu "önceki fiyat" olarak üstü çizili gösterilir.

Menüdeki "Şube farklarını göster" demo anahtarı 3. adımdan gelen fiyatları, tükenen/sunulmayan ürünleri ve şubeye özel
ürünleri vurgular; her kartın altında merkez fiyatını gösterir.

## Demo verisinde bilerek bırakılan farklar

Şube adları sitedeki "Nerelerdeyiz" listesinden; aşağıdakilerin tamamı örnektir. // TEYİT

| Şube | Marka · para · dil | Fiyat | Stok / kapsam | Saat |
|---|---|---|---|---|
| İstanbul · Laleli | Coffee House · TRY · TR | merkez fiyatı (referans) | Cold Brew tükendi; **kampanya:** Iced Latte L, M fiyatına | Pt–Pe 07:30–23:00 · Cu–Ct 07:30–00:30 · Pz 08:30–23:00 |
| Şanlıurfa · Karaköprü | **Coffee Art** · TRY · TR | −%10 katman (5 ₺'ye yuvarlama); Menengiç yerel fiyat 85 ₺ | Tiramisu tükendi; French Press sunulmuyor; **kampanya:** Karamel Frappe | her gün 08:00–00:00 |
| Dubai | Coffee House · **AED** · **AR** | AED fiyat listesi | Salep ve Menengiç sunulmuyor; **kampanya:** Spanish Latte; **şubeye özel:** Karak Chai | Pt–Pe, Pz 07:00–00:00 · Cu–Ct 08:00–02:00 (Asia/Dubai) |
| Bişkek | Coffee House · **KGS** · **RU** | KGS fiyat listesi | Menengiç sunulmuyor; Çilekli Matcha tükendi | her gün 08:00–22:00 (Asia/Bishkek) |

## Panel bağlantısında değişecekler

- `data/*.json` yerine D1 sorguları (ya da panelin export JSON'u) okunur; `resolveMenu()` ve render katmanı aynı kalır.
- Statik üretim yerine aynı render fonksiyonları bir Worker'da istek anında çalıştırılabilir, ya da panelde "yayınla"
  anında şube sayfaları yeniden üretilir (QR kartı değişmez, URL aynı kalır).
- Franchise başvuruları (`/site/franchising#basvuru`) için ayrı tablo: `franchise_applications` (ad, telefon, e-posta,
  şehir, m², bütçe aralığı, marka tercihi, mülk durumu, not, KVKK onay zamanı, dil, kaynak sayfa, durum).
