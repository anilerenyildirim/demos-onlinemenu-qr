# Kahve Diyarı — franchise QR menü demosu (kaynak)

Yayın: `demos.onlinemenu-qr.com/kahvediyariqrdemo` — repo konvansiyonu gereği Cloudflare Pages'te build
**yoktur**. Bu klasör sayfaları üretir; çıktı (`../index.html`, `../sube/`, `../en/`, `../assets/`, `../og.jpg`)
repoya commit edilir.

```sh
npm install
npm run build        # tip kontrolü + tüm rotaların statik üretimi
npm run serve        # repo kökünü wrangler pages dev ile sunar (_headers, .html kırpma dahil)
npm run trace-logo   # yalnızca logo referansı değişirse: _ref/logo.jpg → src/assets/logo-*.svg
```

| Klasör | İçerik |
|---|---|
| `src/data/central/` | merkez menü: kiracı, kategoriler, ürünler, servis akışı metinleri |
| `src/data/branches/` | şube override dosyaları (her şube ayrı dosya) |
| `src/data/resolve.ts` | merkez + override → şube menüsü, referans doğrulama |
| `src/render/` | HTML şablonları · `src/client/app.ts` istemci davranışı · `src/styles/app.css` |
| `SCHEMA.md` | D1 tablo karşılıkları ve panel.onlinemenu-qr.com uyum notu |

Yeni şube: `src/data/branches/` altına dosya ekle, `branches/index.ts`'e kaydet, `npm run build`.
Doğrulanmamış tüm veriler kodda `// TEYİT:` ile işaretli.
