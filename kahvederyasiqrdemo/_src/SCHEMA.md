# Veri şeması — panel.onlinemenu-qr.com (multi-tenant D1) uyumu

> **TEYİT:** Bu demo hazırlanırken panelin gerçek D1 şeması erişilebilir değildi. Aşağıdaki tablo ve alan adları
> panelin tenant → branch mantığına göre **önerilmiştir**; bağlamadan önce panel migration'larıyla karşılaştırılmalı.
> TS tipleri (`src/data/schema.ts`) bu tablolarla birebir aynı alan adlarını kullanır. Şema, kardeş demo
> (kahvediyariqrdemo) ile aynı çekirdeği paylaşır; farklar aşağıda.

## Katmanlar

```
tenants ──┬── categories ── products (branch_id NULL) ── product_variants
          │                     ▲
          └── branches ──┬──────┘ products (branch_id = şube)   ← şubeye özel ürün
                         ├── branch_product_overrides           ← fiyat farkı / tükendi / bu şubede yok
                         └── branch_hours
```

- **Merkez** yalnızca `categories`, `products (branch_id IS NULL)`, `product_variants` yazar.
- **Şube** yalnızca kendi `branch_*` satırlarını ve `branch_id` = kendisi olan ürünleri yazar.
  Merkez ürününün adı ve görseli şubeden değiştirilemez; marka dili her şubede aynı kalır.
- Tüm tablolar `tenant_id` taşır (satır düzeyinde kiracı izolasyonu, tek D1 veritabanı).

## Önerilen DDL (SQLite / D1)

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  default_locale TEXT NOT NULL, locales TEXT NOT NULL,          -- JSON ["tr","en","ar"]
  currency TEXT NOT NULL DEFAULT 'TRY',
  price_rounding_minor INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL, sort_order INTEGER NOT NULL,
  name_i18n TEXT NOT NULL,                                      -- JSON {"tr":"…","en":"…","ar":"…"}
  UNIQUE (tenant_id, slug)
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  name_i18n TEXT NOT NULL,                                      -- markanın yazımı; yalnızca "tr" zorunlu
  kind TEXT NOT NULL CHECK (kind IN ('cafe','cafe_restaurant')),
  city_i18n TEXT NOT NULL,
  address TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  price_adjust_pct REAL NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, slug)
);

CREATE TABLE products (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  branch_id TEXT REFERENCES branches(id),                       -- NULL = merkez ürünü
  category_id TEXT NOT NULL REFERENCES categories(id),
  slug TEXT NOT NULL, sort_order INTEGER NOT NULL,
  name_i18n TEXT NOT NULL,                                      -- markanın yazımı, çevrilmez; yalnızca "tr" zorunlu
  image_key TEXT                                                -- R2 anahtarı: "<kategori>/<slug>" → -320/-480 .avif/.webp
);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL, label_i18n TEXT,                 -- NULL = tek boy
  price_minor INTEGER NOT NULL                                  -- kuruş
);

CREATE TABLE branch_product_overrides (
  branch_id TEXT NOT NULL REFERENCES branches(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  availability TEXT CHECK (availability IN ('available','sold_out','hidden')),
  price_delta_minor INTEGER,
  variant_prices TEXT,                                          -- JSON [{variant_id, price_minor}]
  PRIMARY KEY (branch_id, product_id)
);

CREATE TABLE branch_hours (
  branch_id TEXT NOT NULL REFERENCES branches(id),
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),     -- ISO; kapalı gün satırı yok
  opens TEXT NOT NULL, closes TEXT NOT NULL,                    -- "HH:MM"; closes < opens → ertesi gün
  PRIMARY KEY (branch_id, weekday)
);
```

Kardeş demodan farklar: üçüncü dil (`ar`), `branches.kind` / `city_i18n` / `email`, ürün açıklaması ve alerjen
alanları yok (markanın sitesinde yayınlanmıyor, uydurulmadı), servis akışı tabloları yok.

## Fiyat çözümleme sırası (`src/data/resolve.ts`)

1. Varyantın merkez fiyatı
2. Şube yüzde katmanı `price_adjust_pct` → `tenants.price_rounding_minor` adımına yuvarlanır
   (yalnızca merkez ürünlerine)
3. Ürün bazlı sabit fark `price_delta_minor`
4. Varyant bazlı mutlak şube fiyatı `variant_prices` — varsa öncekilerin hepsini ezer

Arayüzde "Şube fiyatı" rozeti yalnızca 3. ve 4. adımdan gelen fiyatlarda görünür; yüzde katmanı şube kartında tek
satırla gösterilir (her kartta rozet anlamını yitiriyordu).

## Demo verisinde bilerek bırakılan farklar

Şube adı, tipi, adresi, telefonu ve e-postası markanın sitesinden (gerçek). Aşağıdakilerin tamamı örnektir. // TEYİT

| Şube | Fiyat | Stok / kapsam | Saat |
|---|---|---|---|
| İstanbul Büyükçekmece (Cafe) | +%10 katman | Cold Brew Sütlü tükendi; 6 ağır ana yemek sunulmuyor | 08:00–00:00, Cu–Ct 01:00 |
| Balıkesir Merkez | merkez fiyatı (referans) | — | 08:00–23:30 |
| Aydın Nazilli Bamboo AVM | merkez; Cafe Latte +10 ₺ | Syphon ve Chemex sunulmuyor; Franbuazlı Cheesecake tükendi | 10:00–22:00 |
| Antalya Manavgat | +%15 katman; Türk Kahvesi mutlak 140 ₺ | Karadut Deryası tükendi | 08:00–01:00 |
| Bitlis Tatvan | −%5 katman | Tiramisu tükendi | 09:00–23:00, Pz 10:00–22:00 |
| Batman | −%5 katman; Menengiç Kahvesi −10 ₺ | Leb-i Derya Kahvaltı tükendi | 07:00–00:00 |

## Panel bağlantısında değişecekler

- `src/data/central/*` ve `src/data/branches/*` yerine D1 sorguları (ya da panelin export JSON'u) okunur;
  `resolveMenu()` ve render katmanı olduğu gibi kalır.
- Statik üretim yerine aynı render fonksiyonları bir Worker'da istek anında çalıştırılabilir,
  ya da panelde "yayınla" anında şube sayfaları yeniden üretilir (QR kartı değişmez, URL aynı kalır).
