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
4. Otomatik dağıtım için GitHub deposunun Settings → Secrets and variables → Actions alanına `CLOUDFLARE_API_TOKEN` sırrını ekleyin. Anahtar, ilgili hesap için Workers Scripts:Edit ve D1:Edit izinlerini gerektirir. Anahtarı kaynak dosyalarına yazmayın.
5. `.github/workflows/deploy.yml`, yalnızca `main` dalında test, tip kontrolü ve derlemeden sonra D1 şemasını uygular ve Cloudflare'a yayımlar. Hesap kimliği bu dosyada tanımlıdır; farklı hesapta kurarken değiştirin. Açık depoda standart `ubuntu-latest` çalıştırıcısı kullanılır; ücretli büyük çalıştırıcı veya ek hizmet açılmaz.

GitHub Actions toplama işini 5 dakikalık hedef aralıklarla çalıştırır; GitHub zamanlaması gecikebilir. RSS/GDELT için 15 dakika hedeflenir; GDACS ve USGS en erken bir sonraki toplama çalışmasında kontrol edilir. Siteye ziyaretçi gelmesi gerekmez. Son başarılı çekim kaynak durumunda gösterilir; 15 dakika güncellenmeyen toplama bağlantısı gecikmiş sayılır.

## Yönetim ve sırlar

Yönetim Cloudflare Access ile korunur. Yalnızca `/yonetim` ve `/api/admin` yolları için e-posta izin listeli bir Access uygulaması yapılandırın. `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` ve `ADMIN_EMAILS` ortam değerlerini tanımlayın. JWT imzası, issuer, audience ve süre sunucuda doğrulanır. Bağlantı yoksa yönetim kapalıdır; kimlik başlığına tek başına güvenilmez.

İsteğe bağlı korumalı bakım API'si için `INGEST_SECRET` sunucu sırrı kullanılır. Cloudflare AI çevirisi `CLOUDFLARE_ACCOUNT_ID` ve `CLOUDFLARE_AI_TOKEN`; ReliefWeb `RELIEFWEB_APPNAME`; FIRMS `FIRMS_MAP_KEY` gerektirir. Bunları GitHub'a eklemeyin. Çeviri bağlı değilse özgün metin gösterilir.

## Doğrulama

`npm test`, `npm run typecheck`, `npm run build`.

Harita işçisi yayın paketine dahildir. Masaüstü/mobil boyut değişimleri izlenir. Arşiv 30 gündür. Belirsiz konumlar akışta kalır; şehir işaretleri yaklaşık merkezlerdir. 20 başlangıç kaynağı ve iki GDELT keşif sorgusu tanımlıdır; kaynak sayısı her uç noktanın her an çalıştığı anlamına gelmez.

## Kaynaklar ve lisanslar

Haber içerikleri kendi yayıncılarına aittir; kaynak bağlantıları korunur. Harita OpenFreeMap, OpenMapTiles ve OpenStreetMap atıflarını gösterir. Üçüncü taraf bağımlılıkların lisansları geçerlidir. Bu depoda uygulama için ayrıca bir açık kaynak lisansı verilmemiştir.

Cloudflare Free üzerinde ağır RSS işleme kaynak sınırına takıldığı için toplama GitHub standart Linux çalıştırıcısında yapılır. Cloudflare yalnızca siteyi ve D1 veritabanını barındırır. Ücretli plana otomatik geçiş yapılmaz. GitHub, etkinlik olmayan açık depolardaki zamanlanmış işleri 60 gün sonra durdurabilir; Actions ekranındaki durum izlenmelidir.
