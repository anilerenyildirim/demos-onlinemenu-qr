# demos.onlinemenu-qr.com

Müşteri sunumları için statik demo barındırma. Build yok, framework yok — düz dosya servisi.

## Yayın

- **Cloudflare Pages projesi:** `demos-onlinemenu-qr`
- **Framework preset:** None
- **Build command:** (boş)
- **Build output directory:** `/`
- **Custom domain:** `demos.onlinemenu-qr.com`
- **DNS:** CNAME `demos` → `demos-onlinemenu-qr.pages.dev`, Proxied (turuncu bulut açık)

`main` branch'e her push otomatik deploy tetikler.

## Yeni demo ekleme

Kök dizine `{demoadi}.html` koy, push et. Adres: `demos.onlinemenu-qr.com/{demoadi}`
(Cloudflare Pages `.html` uzantısını otomatik kırpar — alt klasör/index.html gerekmez.)

## Kurallar

- `_headers` tüm subdomain'i `X-Robots-Tag: noindex` ile kapatır, `robots.txt` de destekler.
  Müşteri demoları arama sonuçlarına düşmemeli — bu iki dosyayı silme.
- Kök `index.html` bilinçli olarak demo listesi içermez. Demolar sadece bağlantıyı bilene açıktır.
- Bu subdomain diğer müşteri subdomain'lerinden (`{musteri}.onlinemenu-qr.com`) tamamen izoledir.
  Buraya deploy almak hiçbir müşteri sitesine dokunmaz.

## İçerik

| Dosya | Adres |
|---|---|
| `loginpaneldemo.html` | `/loginpaneldemo` — video broşür paneli giriş demosu (İlk Kare) |

QR kodları `qr/` altında (lacivert `#0B1A38`, ERROR_CORRECT_H). Bu klasör de deploy edilir,
zararsızdır — `_headers` sayesinde indekslenmez.
