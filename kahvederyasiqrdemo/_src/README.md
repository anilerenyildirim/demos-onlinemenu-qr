# Kahve Deryası — franchise QR menü demosu (kaynak)

Yayın: `demos.onlinemenu-qr.com/kahvederyasiqrdemo`. Repo konvansiyonu gereği Cloudflare Pages'te build
**yoktur**. Bu klasör sayfaları üretir ve çıktı (`../index.html`, `../sube/`, `../en/`, `../ar/`, `../assets/`,
`../og.jpg`) repoya commit edilir. Ürün görselleri (`../urunler/`) tek seferlik scrape script'inin çıktısıdır.

```sh
npm install
npm run build          # tip kontrolü + tüm rotaların statik üretimi (urunler/ klasörüne dokunmaz)
npm run serve          # repo kökünü wrangler pages dev ile sunar (_headers, .html kırpma dahil) → :8789
npm run measure        # serve açıkken: Lighthouse mobil ×3 → data/olcum.json (teknik şerit bunu basar)
npm run scrape-assets  # TEK SEFERLİK: kahvederyasi.com.tr'den ürün/şube verisi + görseller (idempotent)
```

| Klasör | İçerik |
|---|---|
| `data/urunler.json` | scrape çıktısı: ürün adı → kaynak URL → yerel dosya eşlemesi (+ özet) |
| `data/subeler-tam.json` | scrape çıktısı: 98 yurtiçi şube (liste) + 6 demo şubesinin tam detayı |
| `data/olcum.json` | bu demonun kendi Lighthouse ölçümü (`npm run measure`) |
| `src/data/central/` | merkez menü: kiracı, kategoriler, ürünler (ad/görsel scrape'ten, fiyat örnek) |
| `src/data/branches/` | şube override dosyaları (her şube ayrı dosya; gerçek alanlar `real.ts` ile JSON'dan) |
| `src/data/resolve.ts` | merkez + override → şube menüsü, referans doğrulama |
| `src/render/` | HTML şablonu · `src/client/app.ts` istemci davranışı · `src/styles/app.css` |
| `scripts/` | `build.ts` · `scrape-assets.ts` · `measure.ts` |
| `SCHEMA.md` | D1 tablo karşılıkları ve panel.onlinemenu-qr.com uyum notu |

Yeni şube: `src/data/branches/` altına dosya ekle (`defineBranch`, `siteSlug` = sitedeki detay sayfası),
`branches/index.ts`'e kaydet, `npm run build`. Doğrulanmamış tüm veriler kodda `// TEYİT:` ile işaretli.

## Rotalar

| Yol | İçerik |
|---|---|
| `/kahvederyasiqrdemo/` | TR giriş — varsayılan şube (İstanbul Büyükçekmece); kayıtlı şube/dil tercihi yalnızca burada uygulanır |
| `/kahvederyasiqrdemo/sube/<slug>` | şube sayfası (6 şube) |
| `/kahvederyasiqrdemo/{en,ar}/…` | aynı rotalar İngilizce / Arapça (RTL) |
| `…/sube/` | girişe yönlendirir |

Her rota hazır HTML'dir; doğrudan erişim ve yenileme 404 vermez. Şube değişimi sayfa yenilemeden uygulanır
(fiyat/stok/saat tablosu sayfaya gömülü) ve adres çubuğu o şubenin kalıcı URL'ine güncellenir.

## Kararlar

- **Logo:** `_ref/logo.png` (sitenin başlığındaki resmi logo, 238×81). Koyu zeminde gri wordmark okunmadığı için
  onaylı karar gereği wordmark pikselleri beyaza çevrilir; form, oran, çözünürlük ve magenta chevron değişmez.
  Vektör/yüksek çözünürlüklü logo markadan istenmeli. // TEYİT
- **Tipografi:** Manrope Variable (Latin, geniş ve net, Türkçe karakterlerin tamamı, 40 KB) + IBM Plex Sans Arabic
  400/600 (yalnızca Arapça, temel bloğa alt kümeli, 33 KB, `font-display: optional`). // TEYİT
- **Ürün görselleri:** kaynak 600×740 olduğu için 320w/480w üretildi; 720w büyütme gerektirir, üretilmedi.
  İlk 4 kart yerel `loading="lazy"`; diğerleri 300 px mesafeli IntersectionObserver ile (yerel lazy mobilde ~20 görseli
  önden indirip ilk yükleme bütçesini aşıyordu). JS yoksa `<noscript>` yedeği.
- **CSP:** ortak `_headers`'a dokunulmadı; sayfa `<meta http-equiv="Content-Security-Policy">` ile daraltır
  (`img-src 'self'`, `script-src 'self'`, `font-src 'self'`). İki politika birlikte uygulanır.
