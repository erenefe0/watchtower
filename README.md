# Watchtower

Ortadoğu odaklı açık kaynak olay izleme platformu. Türkçe arayüz, yakınlaştırılabilir harita, kaynak kataloğu, filtrelenebilir haber akışı ve olay düzenleme paneli.

React, TypeScript, Vinext, MapLibre GL JS, Cloudflare Workers ve D1 kullanır. Haberler kaynak bildirimi olarak sunulur; otomatik doğrulama veya kesin olay konumu iddiası taşımaz.

## Çalıştırma

```sh
npm ci
npx wrangler d1 migrations apply DB --local
npm run dev
```

## Cloudflare kurulumu

1. `wrangler d1 create watchtower-db` ile D1 oluşturun ve dönen gerçek `database_id` değerini `wrangler.jsonc` içine yazın.
2. `npm run db:migrate` ile şemayı uygulayın.
3. `npm run deploy` ile uygulamayı yayımlayın.
4. Workers & Pages altında GitHub deposunu bağlayın. Derleme komutu `npm run build`, dağıtım komutu `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy` olmalı.

Dakikalık Cron tetikleyicisi kaynakların sıradaki çekim zamanını kontrol eder. RSS/GDELT için 15, GDACS için 5, USGS için 2 dakika hedeflenir. Kaynak erişimi ve hesap kotaları gecikmelere yol açabilir. Ziyaretçi olmasa da çalışması ancak gerçek Cron kaydı üretimi gözlenince doğrulanmış sayılır.

## Yönetim ve sırlar

Yönetim Cloudflare Access ile korunur. Yalnızca `/yonetim` ve `/api/admin` yolları için e-posta izin listeli bir Access uygulaması yapılandırın. `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` ve `ADMIN_EMAILS` ortam değerlerini tanımlayın. JWT imzası, issuer, audience ve süre sunucuda doğrulanır. Bağlantı yoksa yönetim kapalıdır; kimlik başlığına tek başına güvenilmez.

İsteğe bağlı korumalı bakım API'si için `INGEST_SECRET` sunucu sırrı kullanılır. Cloudflare AI çevirisi `CLOUDFLARE_ACCOUNT_ID` ve `CLOUDFLARE_AI_TOKEN`; ReliefWeb `RELIEFWEB_APPNAME`; FIRMS `FIRMS_MAP_KEY` gerektirir. Bunları GitHub'a eklemeyin. Çeviri bağlı değilse özgün metin gösterilir.

## Doğrulama

`npm test`, `npm run typecheck`, `npm run build`.

Harita işçisi yayın paketine dahildir. Masaüstü/mobil boyut değişimleri izlenir. Arşiv 30 gündür. Belirsiz konumlar akışta kalır; şehir işaretleri yaklaşık merkezlerdir. 20 başlangıç kaynağı ve iki GDELT keşif sorgusu tanımlıdır; kaynak sayısı her uç noktanın her an çalıştığı anlamına gelmez.

## Kaynaklar ve lisanslar

Haber içerikleri kendi yayıncılarına aittir; kaynak bağlantıları korunur. Harita OpenFreeMap, OpenMapTiles ve OpenStreetMap atıflarını gösterir. Üçüncü taraf bağımlılıkların lisansları geçerlidir. Bu depoda uygulama için ayrıca bir açık kaynak lisansı verilmemiştir.

Cloudflare Free, HTTP ve Cron çağrısı başına 10 ms CPU sınırı uygular. Çok kaynaklı toplamanın bu planda kesintisiz çalışacağı garanti edilmez; canlı ölçüm veya toplama işinin ayrı bir çalıştırıcıya taşınması gerekir. Ücretli plana otomatik geçiş yapılmaz.
