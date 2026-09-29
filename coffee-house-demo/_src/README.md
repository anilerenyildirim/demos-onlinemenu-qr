# Coffee House — sunum + franchise QR menü + kurumsal site demosu (kaynak)

Yayın: `demos.onlinemenu-qr.com/coffee-house-demo`. Repo konvansiyonu gereği Cloudflare Pages'te build **yoktur**.
Bu klasör sayfaları üretir; çıktı (`../index.html`, `../menu/`, `../site/`, `../assets/`, `../og*.jpg`) repoya commit
edilir. Tanıtım videosunun sıkıştırılmış hali (`../video/`) tek seferlik `npm run video` çıktısıdır; build ona dokunmaz.
Brief: repo kökündeki `COFFEE-HOUSE-DEMO.md` (commit edilmez — kök yayınlanıyor).

```sh
npm install
npm run build          # tip kontrolü + i18n anahtar kontrolü + tüm rotaların statik üretimi
npm run serve          # repo kökünü wrangler pages dev ile sunar (_headers, .html kırpma dahil) → :8790
npm run measure        # Lighthouse mobil → audit/coffee-house-lighthouse.json (sunumdaki karşılaştırma bunu basar)
npm run fetch-assets   # TEK SEFERLİK: logo, video, 23 galeri görseli → ../_ref/ (anlamlı adlarla, idempotent)
npm run trace-logo     # TEK SEFERLİK: ../_ref/logo.png → src/assets/coffee-house-logo.svg (potrace, 3 katman)
npm run video          # TEK SEFERLİK: 103 MB tanıtım videosu → ../video/hero-720.{mp4,webm} (~0,8 MB) + poster
npm run geo            # TEK SEFERLİK: Natural Earth → data/geo/*.json (bölge + Marmara)
npx tsx scripts/shots.ts mobile-full /coffee-house-demo/site/   # görsel kontrol (.tmp/shots, serve açıkken)
```

| Klasör | İçerik |
|---|---|
| `data/menu.json` | **merkez katalog** (sürümlü): kategoriler, ürünler, boylar, TRY/AED/KGS fiyat listeleri, alerjen, etiket, görsel kırpımı |
| `data/branches.json` | **şube override katmanı**: marka, para birimi, varsayılan dil, saat dilimi, saatler, fiyat katmanı, stok, kampanya, şubeye özel ürün |
| `data/ag.json` | şube ağı (sitedeki 19 kayıt, tekrarlar işaretli) + 26 referans + firma iletişim bilgisi |
| `data/gorseller.json` | 23 galeri görseli: kaynak URL → anlamlı ad → 4 dilde alt metin (2 kopya piksel düzeyinde doğrulandı) |
| `data/geo/` | kendi barındırdığımız taban harita (Natural Earth, public domain) |
| `i18n/{tr,en,ar,ru}.json` | tüm arayüz metinleri (menü + site) — tek kaynak; `sunum.json` sunum sayfası (TR) |
| `audit/coffee-house-lighthouse.json` | mevcut site ve demo sayfalarının Lighthouse ölçümü (ortanca) |
| `src/data/` | `load.ts` JSON → D1 satırları + doğrulama · `resolve.ts` merkez + override → şube menüsü · `network.ts` |
| `src/render/` | `brief.ts` sunum · `menu.ts` QR menü · `site/` kurumsal site · `document.ts` ortak head (CSP, OG, hreflang) |
| `src/client/` | `brief.ts` · `menu.ts` · `site.ts` · `map.ts` (Leaflet; harita görünür olunca ayrı paket olarak iner) |
| `scripts/` | `build.ts` + `lib/` (fontlar, görseller, OG, harita önizleme) · `measure.ts` · `shots.ts` · tek seferlikler |
| `SCHEMA.md` | D1 tablo önerisi ve panel.onlinemenu-qr.com uyum notu |

## Rotalar

| Yol | İçerik |
|---|---|
| `/coffee-house-demo/` | **sunum** (TR): kapak → neden ulaştık → fırsatlar (+ Lighthouse) → panel → demolar → nasıl ilerleriz → e-posta |
| `/coffee-house-demo/menu/` | şube seçici — her şubenin karekodu telefonla okutulabilir |
| `/coffee-house-demo/menu/<şube>/` | şube QR menüsü, şubenin **varsayılan dilinde** (karekod bu adrese basılır) |
| `/coffee-house-demo/menu/<şube>/<dil>` | aynı menü diğer dillerde (`tr`, `en`, `ar`, `ru`) |
| `/coffee-house-demo/site/` | kurumsal site TR — `franchising`, `subeler`, `markalarimiz`, `referanslar`, `hakkimizda`, `iletisim`, `kvkk`, `cerez-politikasi` |
| `/coffee-house-demo/site/en/…` | EN, tüm sayfalar (`branches`, `our-brands`, `references`, `about`, `contact`, `privacy-notice`, `cookie-policy`) |
| `/coffee-house-demo/site/{ar,ru}/…` | anasayfa, `franchising`, `branches`, `contact`; diğer sayfalar EN'e bağlanır ve "EN" ile işaretlenir |

Demo şubeleri: `istanbul-laleli` (Coffee House, TRY, TR) · `sanliurfa-karakopru` (Coffee Art teması, TRY, −%10) ·
`dubai` (AED, AR varsayılan) · `biskek` (KGS, RU varsayılan). Her rota hazır HTML'dir; menüde şube değişimi sayfa
yenilemeden uygulanır (fiyat/stok/tema tablosu sayfaya gömülü) ve adres çubuğu şubenin kalıcı URL'ine güncellenir.

Yeni şube: `data/branches.json`'a ekle (ağdaki `network_id` ile), `npm run build`. Yeni ürün: `data/menu.json`'a ekle —
her para biriminde fiyat zorunlu; eksik çeviri, bilinmeyen boy/alerjen/kategori build'i düşürür.

## Kararlar

- **Yapı:** brief Astro + Tailwind bekliyordu; repoda framework yok (kardeş demolar gibi TS build → statik HTML).
  Veri, brief'in istediği gibi sürümlü JSON'dur; tipler ve doğrulama D1 satırı biçiminde (`src/data/schema.ts`).
- **Palet** (onaylı, logodan ve mağaza fotoğraflarından ölçüldü): `#4A8CC8` logo halkası · `#2B6AA6` metin/buton
  mavisi (beyazda 5,65:1) · `#151515` wordmark · `#F6F3EE` sıcak beyaz · `#462619` espresso · `#F37411` neon (yalnızca
  vurgu) · `#05080C` gece cephesi. İmza öğesi: logonun konuşma balonu (görsellerde tek sivri köşe, hero'da video penceresi).
- **Logo:** sitedeki PNG (düşük çözünürlükten büyütülmüş) potrace ile 3 katman izlendi, orijinalle örtüşme %99,5+.
  Vektör logo markadan istenmeli. **Coffee Art'ın logosu yok** → tipografik geçici işaret. // TEYİT
- **Tipografi:** Sofia Sans (gövde) + Sofia Sans Extra Condensed (başlık; logodaki dar yazıyla akraba) — ikisi de Kiril
  içerir; IBM Plex Sans Arabic (yalnızca AR). `₺` Sofia'da yok → Plex'in glifinden 1 KB'lık "CH Lira" yüzü. Tüm fontlar
  alt kümeli, unicode-range'li; TR sayfası yalnızca Latin + Türkçe dosyalarını indirir. // TEYİT: font marka onayı
- **Fiyat biçimi:** Intl değil, deterministik (`src/shared/format.ts`) — tarayıcıların CLDR sürümleri KGS için farklı
  sembol basıyor (⃀ çoğu fontta yok). Arapçada rakamlar Latin (brief).
- **Harita:** Leaflet + kendi barındırdığımız Natural Earth verisi. Ortak `_headers` CSP'si dış karoları engelliyor
  (`img-src 'self' data:`) ve kardeş demolar `_headers`'a dokunmadı. Şubelerin bugün yalnızca şehir düzeyinde konumu
  var. Adresler gelince OSM katmanı: `src/client/map.ts` → `TILE_URL` + `_headers`'a demo yolu için izin.
- **Video:** 2 dk'lık dikey kaynaktan (103 MB) 7 kesitlik ~10 sn sessiz döngü, 720×720 kare (balon penceresi), MP4
  0,8 MB + WebM 0,7 MB. Sayfa yüklendikten ve tarayıcı boşa çıktıktan sonra yüklenir; hareket azaltma / veri tasarrufu
  tercihinde oynamaz, durdurulabilir, ekran dışında durur. LCP adayı AVIF poster (15 KB).
- **CSP:** ortak `_headers`'a dokunulmadı; her sayfa `<meta http-equiv="Content-Security-Policy">` ile daraltır
  (satır içi script yok; JSON veri blokları çalıştırılmaz). Tüm varlıklar self-host, dış istek yok.
- **Başvuru formu:** istemci doğrulaması + başarı durumu; **gerçek gönderim yok** (kodda not). Canlıda: Worker →
  Resend bildirimi + Turnstile + hız sınırı + başvuruların panelde listelenmesi.
- **Sayılar:** rakam şeridi `data/ag.json`'dan hesaplanır (16 açık · 2 yakında · 3 ülke · 2 marka). Sitede 19 kayıt var;
  Esenyurt iki kez geçtiği için tek sayıldı. %30 net kâr ifadesi (hukuki risk) demoda yok — karar gereği.
- **Lighthouse:** SEO puanı kıyaslanmıyor — demo sayfaları bilinçli olarak `noindex` (Lighthouse `is-crawlable` düşer).
  Bu engel dışındaki SEO denetimleri ayrıca kaydedilir (`seo_excl_crawlable`).

## TEYİT listesi (kodda `// TEYİT` ile işaretli)

Menü, fiyatlar, alerjenler ve görsel ↔ ürün eşleşmesi örnek · şube adresleri (Laleli için firma adresi kullanıldı),
saatleri, telefonları · hangi şube hangi marka (referanslardan çıkarım; Dubai referanslarda "Coffee Art — Ajman") ·
Esenyurt tekrarı, Laleli "yakında" · Gebze/Pendik şube mi referans mı · Bişkek varsayımı (sitede "Kırgızistan") ·
WhatsApp numarası · 2007 (know-how mı kuruluş mu) · AR/RU metinleri makine çevirisi (native kontrol) · KVKK/çerez
metinleri taslak (hukuki inceleme) · Coffee Art logo ve kimliği · vektör logo · font onayı.
