# Veri şeması — panel.onlinemenu-qr.com (multi-tenant D1) uyumu

> **TEYİT:** Bu demo hazırlanırken panelin gerçek D1 şeması erişilebilir değildi. Aşağıdaki tablo ve
> alan adları panelin tenant → branch mantığına göre **önerilmiştir**; bağlamadan önce panel
> migration'larıyla karşılaştırılmalı. TS tipleri (`src/data/schema.ts`) bu tablolarla birebir aynı
> alan adlarını kullanır, böylece fark bir yeniden adlandırma eşlemesiyle kapanır.

## Katmanlar

```
tenants ──┬── categories ── products (branch_id NULL) ── product_variants
          │                     ▲
          └── branches ──┬──────┘ products (branch_id = şube)   ← şubeye özel ürün
                         ├── branch_product_overrides           ← fiyat farkı / tükendi / bu şubede yok
                         ├── branch_hours
                         └── branch_order_steps
```

- **Merkez** yalnızca `categories`, `products (branch_id IS NULL)`, `product_variants` yazar.
- **Şube** yalnızca kendi `branch_*` satırlarını ve `branch_id` = kendisi olan ürünleri yazar.
  Merkez ürününün adı/açıklaması/görseli şubeden değiştirilemez; marka dili her şubede aynı kalır.
- Tüm tablolar `tenant_id` taşır (satır düzeyinde kiracı izolasyonu, tek D1 veritabanı).

## Önerilen DDL (SQLite / D1)

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  default_locale TEXT NOT NULL, locales TEXT NOT NULL,          -- JSON ["tr","en"]
  currency TEXT NOT NULL DEFAULT 'TRY',
  price_rounding_minor INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL, sort_order INTEGER NOT NULL, icon TEXT NOT NULL,
  name_i18n TEXT NOT NULL, description_i18n TEXT,               -- JSON {"tr":"…","en":"…"}
  UNIQUE (tenant_id, slug)
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL, is_sample INTEGER NOT NULL DEFAULT 0,
  name_i18n TEXT NOT NULL, kind_i18n TEXT NOT NULL, address_i18n TEXT NOT NULL,
  phone TEXT, timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  price_adjust_pct REAL NOT NULL DEFAULT 0,
  service_mode TEXT NOT NULL CHECK (service_mode IN ('self_service','table_service','mixed')),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE products (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
  branch_id TEXT REFERENCES branches(id),                       -- NULL = merkez ürünü
  category_id TEXT NOT NULL REFERENCES categories(id),
  slug TEXT NOT NULL, sort_order INTEGER NOT NULL,
  name_i18n TEXT NOT NULL, description_i18n TEXT NOT NULL,
  image_key TEXT,                                               -- R2 anahtarı
  tags TEXT NOT NULL DEFAULT '[]', allergens TEXT NOT NULL DEFAULT '[]'  -- JSON dizileri
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

CREATE TABLE branch_order_steps (
  branch_id TEXT NOT NULL REFERENCES branches(id),
  sort_order INTEGER NOT NULL, text_i18n TEXT NOT NULL,
  PRIMARY KEY (branch_id, sort_order)
);
```

`variant_prices` ayrı bir tabloya da (`branch_variant_prices`) açılabilir; demo tek satırda tutuyor.

## Fiyat çözümleme sırası (`src/data/resolve.ts`)

1. Varyantın merkez fiyatı
2. Şube yüzde katmanı `price_adjust_pct` → `tenants.price_rounding_minor` adımına yuvarlanır
   (yalnızca merkez ürünlerine; şubeye özel ürünün fiyatı zaten şube fiyatıdır)
3. Ürün bazlı sabit fark `price_delta_minor`
4. Varyant bazlı mutlak şube fiyatı `variant_prices` — varsa öncekilerin hepsini ezer

Panelde aynı sıra bir SQL görünümü ya da Worker servis katmanı olarak uygulanabilir.
`resolve.ts` içindeki `validate()` şu an yabancı anahtar kısıtlarının işini build sırasında yapar.

## Demo verisinde bilerek bırakılan farklar

| Şube | Fiyat | Stok / kapsam | Diğer |
|---|---|---|---|
| Örnek Şube · Cadde | merkez; Flat White +5 ₺ | Cold Brew tükendi | Affogato şubeye özel, masaya servis, gece yarısını geçen saatler |
| Örnek Şube · AVM | +%10 katman | Tarçınlı rulo tükendi | self servis |
| Örnek Şube · Kampüs | −%5 katman; filtre kahvede mutlak fiyat | Paket kahve kategorisi bu şubede yok | pazar kapalı |
| Örnek Şube · Yol Üstü | +%5 katman | Sahlep yok, cheesecake tükendi | Yol termosu şubeye özel, gel-al + self servis |

## Panel bağlantısında değişecekler

- `src/data/central/*` ve `src/data/branches/*` yerine D1 sorguları (ya da panelin export JSON'u) okunur;
  `resolveMenu()` ve render katmanı olduğu gibi kalır.
- Statik üretim yerine aynı render fonksiyonları bir Worker'da istek anında çalıştırılabilir,
  ya da panelde "yayınla" anında şube sayfaları yeniden üretilir.
